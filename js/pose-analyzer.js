class PoseAnalyzer {
    constructor(config) {
        this.config = config;
        this.lastFeedback = {};
        this.poseNet = null;
        this.faceMesh = null;
        this.handpose = null;
        this.lastAnalysis = {
            timestamp: 0,
            data: null
        };
        this.feedbackHistory = [];
        this.initialized = false;
    }

    async initialize() {
        try {
            // Verificar acceso a la cámara primero
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: 640,
                    height: 480,
                    facingMode: "user"
                } 
            });

            // Inicializar modelos en paralelo
            const [poseNetModel, faceMeshModel] = await Promise.all([
                this._initializePoseNet(),
                this._initializeFaceMesh()
            ]);

            this.poseNet = poseNetModel;
            this.faceMesh = faceMeshModel;

            // Configurar Face Mesh
            await this.faceMesh.setOptions({
                ...this.config.MEDIAPIPE_CONFIG.face,
                selfieMode: true
            });

            // Inicializar detector de gestos
            this.handpose = new Handpose.GestureRecognizer({
                runtime: 'mediapipe',
                modelType: 'full',
                maxNumHands: 2
            });
            
            await this.handpose.initialize();
            this.initialized = true;
            
            console.log('Pose Analyzer inicializado correctamente');
            return true;
        } catch (error) {
            console.error('Error al inicializar Pose Analyzer:', error);
            this._updateUIError('No se pudo inicializar el análisis de pose y gestos. ' +
                              'Por favor, verifica el acceso a la cámara.');
            return false;
        }
    }

    async analyzePose(video) {
        if (!this.initialized) {
            throw new Error('Pose Analyzer no está inicializado');
        }

        try {
            var currentTime = Date.now();
            if (currentTime - this.lastAnalysis.timestamp < 100) {
                return this.lastAnalysis.data;
            }

            var analysis = await this._performAnalysis(video);
            
            if (analysis) {
                this._updateFeedback(analysis);
                this.lastAnalysis = {
                    timestamp: currentTime,
                    data: analysis
                };
            }

            return analysis;
        } catch (error) {
            console.error('Error en análisis de pose:', error);
            this._handleAnalysisError(error);
            return null;
        }
    }

    async _performAnalysis(video) {
        // Realizar análisis en paralelo
        var [poses, faces, hands] = await Promise.all([
            this.poseNet.estimatePoses(video, {
                flipHorizontal: false,
                maxDetections: 1
            }),
            this.faceMesh.estimateFaces(video),
            this.handpose.detect(video)
        ]);

        if (!poses.length) return null;

        var pose = poses[0];
        return {
            postura: this._analyzePosture(pose),
            mirada: this._analyzeGaze(pose, faces[0]),
            gestos: this._analyzeGestures(hands),
            expresiones: faces.length ? this._analyzeExpressions(faces[0]) : null,
            confianza: this._calculateConfidence(pose)
        };
    }

    _updateFeedback(analysis) {
        const feedbackElement = document.getElementById('pose-feedback');
        if (feedbackElement) {
            var feedback = [];
            
            if (!analysis.postura.isGood) {
                feedback.push('📐 ' + analysis.postura.mensaje);
            }
            if (!analysis.mirada.isGood) {
                feedback.push('👀 ' + analysis.mirada.mensaje);
            }
            if (analysis.gestos && analysis.gestos.mensaje) {
                feedback.push('👋 ' + analysis.gestos.mensaje);
            }

            feedbackElement.innerHTML = feedback.length ? 
                feedback.join('<br>') : 
                '✅ ¡Excelente postura y expresión corporal!';
        }
    }

    _handleAnalysisError(error) {
        this._updateUIError('Se produjo un error en el análisis. ' +
                          'Por favor, verifica la iluminación y tu posición frente a la cámara.');
    }

    _updateUIError(message) {
        const errorDiv = document.getElementById('pose-error') || 
                        this._createErrorElement();
        
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        
        // Ocultar error después de 5 segundos
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    }

    _createErrorElement() {
        const div = document.createElement('div');
        div.id = 'pose-error';
        div.className = 'error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative';
        document.querySelector('.simulator-container')?.appendChild(div);
        return div;
    }
}
