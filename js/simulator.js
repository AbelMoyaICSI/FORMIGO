// Configuración global
const progressState = {
    basic: 10,
    intermediate: 17,
    advanced: 0
};

const levels = {
    basic: [
        "Conociéndote mejor",
        "Preferencias de comunicación",
        "Gestión de Situaciones Desafiantes",
        "Identificando Tus Intereses",
        "Habilidades Generales y Adaptabilidad",
        "Descubriendo tu Identidad Profesional",
        "Explorando Tus Metas Personales",
        "Conexión con Tus Habilidades Interpersonales",
        // ... resto de niveles ...
    ],
    intermediate: [
        "Certificación Avanzada: Dominio Profesional"
    ],
    advanced: [
        "Respuestas Técnicas por Industria",
        "STAR en Escenarios Multidimensionales",
        // ... resto de niveles avanzados ...
    ]
};

// Funciones de navegación
function showProgressPage() {
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('simulator').classList.add('hidden');
    document.getElementById('progress-page').classList.remove('hidden');
    showLevels(currentCategory);
}

function goToProgressPage() {
    if (completionModal) {
        completionModal.classList.add('hidden');
    }
    progressState[currentCategory] = Math.max(progressState[currentCategory], currentLevel + 1);
    document.getElementById('simulator').classList.add('hidden');
    showProgressPage();
}

function returnToMenu() {
    document.getElementById('simulator').classList.add('hidden');
    document.getElementById('progress-page').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
}

function showLevels(category) {
    const levelsContainer = document.getElementById("levels-container");
    const levelCategoryTitle = document.getElementById("level-category");
    
    levelCategoryTitle.textContent = 
        category === "basic" ? "Básico" : 
        category === "intermediate" ? "Intermedio" : "Avanzado";
    
    levelsContainer.innerHTML = "";
    
    levels[category].forEach((level, index) => {
        const isUnlocked = progressState[category] > index;
        // ... resto del código de renderizado de niveles ...
    });
}

// Manejadores de eventos y estado
const simulatorState = {
    initialized: false,
    currentSession: null,
    services: {
        speech: null,
        pose: null,
        face: null
    }
};

// Función para inicializar servicios de IA
async function initializeAIServices() {
    try {
        // Solo cargar si aún no están inicializados
        if (!simulatorState.initialized) {
            const success = await window.loadAIScripts();
            if (!success) {
                throw new Error('No se pudieron cargar los servicios de IA');
            }
            simulatorState.initialized = true;
        }
        return true;
    } catch (error) {
        console.error('Error al inicializar servicios de IA:', error);
        // Mostrar mensaje al usuario
        const errorMsg = document.getElementById('error-message');
        if (errorMsg) {
            errorMsg.textContent = 'No se pudieron inicializar algunos servicios. ' +
                                 'Por favor, verifica los permisos del micrófono y la cámara.';
            errorMsg.classList.remove('hidden');
        }
        return false;
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // Botones de volver al menú
    document.querySelectorAll('button.volver-menu').forEach(boton => {
        boton.addEventListener('click', returnToMenu);
    });

    // Inicializar el simulador y sus componentes
    await initializeAIServices();
    initializeSimulator();
});
