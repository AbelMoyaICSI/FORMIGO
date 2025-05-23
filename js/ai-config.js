// Configuración para servicios de IA
const AI_CONFIG = {
    // Estado de los servicios de IA
    services: {
        speech: {
            initialized: false,
            error: null
        },
        face: {
            initialized: false,
            error: null
        },
        pose: {
            initialized: false,
            error: null
        }
    },

    // Azure Speech Service
    AZURE_SPEECH_KEY: "YOUR_AZURE_SPEECH_KEY",
    AZURE_SPEECH_REGION: "eastus",
    
    // Configuración de PoseNet con opciones optimizadas
    POSENET_CONFIG: {
        architecture: 'MobileNetV1',
        outputStride: 16,
        inputResolution: { width: 640, height: 480 },
        multiplier: 0.75,
        scoreThreshold: 0.5,
        nmsRadius: 20
    },
    
    // Configuración de MediaPipe
    MEDIAPIPE_CONFIG: {
        face: {
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        }
    },
    
    // Umbrales para análisis de postura y gestos
    POSE_THRESHOLDS: {
        shoulderSlope: 20,
        headTilt: 15,
        eyeContact: 0.7,
        handMovement: 30,
        gestureConfidence: 0.6
    },

    // Configuración de análisis de voz
    VOICE_ANALYSIS: {
        minConfidence: 0.7,
        toneThresholds: {
            pitch: {
                min: -10,
                max: 10
            },
            speed: {
                min: 0.8,
                max: 1.2
            },
            volume: {
                min: -5,
                max: 5
            }
        },
        emotionWeights: {
            confidence: 0.3,
            enthusiasm: 0.2,
            clarity: 0.3,
            professionalism: 0.2
        }
    },

    // Umbrales de feedback
    FEEDBACK_THRESHOLDS: {
        posture: 0.7,
        speech: 0.75,
        engagement: 0.8,
        gesture: 0.6,
        overall: 0.75
    }
};
