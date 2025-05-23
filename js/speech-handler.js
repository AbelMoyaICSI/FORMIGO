class SpeechHandler {
    constructor(config) {
        this.config = config;
        this.speechConfig = null;
        this.synthesizer = null;
        this.recognizer = null;
        this.audioContext = null;
        this.analyzer = null;
        this.mediaStream = null;
        this.isListening = false;
        this.onRecognized = null;
        this.onRecognizing = null;
        this.onToneAnalyzed = null;
        this.speechHistory = [];
        this.lastAnalysis = {
            timestamp: 0,
            data: null
        };
    }    async initialize() {
        try {
            // Primero solicitar permiso del micrófono
            try {
                this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: true,
                    video: false 
                });
                
                // Solo proceder con la inicialización si tenemos permiso del micrófono
                // Configurar Azure Speech Services
                if (!this.config.AZURE_SPEECH_KEY || this.config.AZURE_SPEECH_KEY === "YOUR_AZURE_SPEECH_KEY") {
                    throw new Error("Azure Speech Key no configurada");
                }
                
                this.speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
                    this.config.AZURE_SPEECH_KEY,
                    this.config.AZURE_SPEECH_REGION
                );
                this.speechConfig.speechRecognitionLanguage = "es-ES";
                this.speechConfig.speechSynthesisLanguage = "es-ES";
                this.speechConfig.speechSynthesisVoiceName = "es-ES-ElviraNeural";

                // Configurar Web Audio API para análisis de tono
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyzer = this.audioContext.createAnalyser();
                this.analyzer.fftSize = 2048;
                
                // Conectar el stream de audio al analizador
                const source = this.audioContext.createMediaStreamSource(this.mediaStream);
                source.connect(this.analyzer);

                // Configurar sintetizador y reconocedor
                this.synthesizer = new SpeechSDK.SpeechSynthesizer(this.speechConfig);
                const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(this.mediaStream);
                this.recognizer = new SpeechSDK.SpeechRecognizer(this.speechConfig, audioConfig);
                
                return true;
            } catch (micError) {
                console.error('Error al acceder al micrófono:', micError);
            }

            this._setupRecognitionEvents();
            console.log('Speech Handler initialized');
            return this;
        } catch (error) {
            console.error('Error initializing Speech Handler:', error);
            throw error;
        }
    }    _setupRecognitionEvents() {
        this.recognizer.recognizing = async (s, e) => {
            if (this.onRecognizing) {
                const text = e.result.text;
                this.onRecognizing(text);
                
                // Realizar análisis en tiempo real
                const analysis = await this.analyzeSpeech(text);
                if (analysis && this.onToneAnalyzed) {
                    this.onToneAnalyzed(analysis);
                }
            }
        };

        this.recognizer.recognized = async (s, e) => {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                const text = e.result.text;
                
                // Realizar análisis completo
                const analysis = await this.analyzeSpeech(text);
                
                if (this.onRecognized) {
                    this.onRecognized(text, analysis);
                }
            }
        };

        this.recognizer.canceled = (s, e) => {
            if (e.reason === SpeechSDK.CancellationReason.Error) {
                console.error(`Speech recognition error: ${e.errorDetails}`);
            }
            this.isListening = false;
            
            // Limpiar recursos de audio
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
            }
        };
    }

    async startListening() {
        if (!this.isListening) {
            try {
                await this.recognizer.startContinuousRecognitionAsync();
                this.isListening = true;
                return true;
            } catch (error) {
                console.error('Error starting recognition:', error);
                return false;
            }
        }
        return false;
    }

    async stopListening() {
        if (this.isListening) {
            try {
                await this.recognizer.stopContinuousRecognitionAsync();
                this.isListening = false;
                return true;
            } catch (error) {
                console.error('Error stopping recognition:', error);
                return false;
            }
        }
        return false;
    }

    async speak(text, options = {}) {
        try {
            const ssml = this._generateSSML(text, options);
            const result = await this.synthesizer.speakSsmlAsync(ssml);
            
            if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                return true;
            } else {
                console.error('Speech synthesis failed:', result.errorDetails);
                return false;
            }
        } catch (error) {
            console.error('Error in speech synthesis:', error);
            return false;
        }
    }

    _generateSSML(text, options) {
        const rate = options.rate || "1.0";
        const pitch = options.pitch || "+0%";
        const volume = options.volume || "+0%";

        return `
            <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="es-ES">
                <voice name="es-ES-ElviraNeural">
                    <prosody rate="${rate}" pitch="${pitch}" volume="${volume}">
                        ${text}
                    </prosody>
                </voice>
            </speak>`;
    }

    dispose() {
        if (this.recognizer) {
            this.recognizer.close();
        }
        if (this.synthesizer) {
            this.synthesizer.close();
        }
    }

    async analyzeSpeech(text) {
        const currentTime = Date.now();
        if (currentTime - this.lastAnalysis.timestamp < 100) {
            return this.lastAnalysis.data;
        }

        const analysis = {
            text: text,
            tone: await this._analyzeTone(),
            speed: this._calculateSpeechSpeed(text),
            clarity: this._analyzeSpeechClarity(text),
            volume: this._analyzeVolume(),
            confidence: 0,
            feedback: []
        };

        // Analizar confianza basada en múltiples factores
        analysis.confidence = this._calculateConfidenceScore(analysis);

        // Generar feedback
        analysis.feedback = this._generateSpeechFeedback(analysis);

        // Actualizar historial
        this._updateSpeechHistory(analysis);

        this.lastAnalysis = {
            timestamp: currentTime,
            data: analysis
        };

        if (this.onToneAnalyzed) {
            this.onToneAnalyzed(analysis);
        }

        return analysis;
    }

    async _analyzeTone() {
        if (!this.analyzer) return null;

        const bufferLength = this.analyzer.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        this.analyzer.getFloatTimeDomainData(dataArray);

        // Calcular características del tono
        const pitch = this._calculatePitch(dataArray);
        const variation = this._calculateToneVariation(dataArray);

        return {
            pitch: pitch,
            variation: variation,
            modulation: this._calculateModulation(dataArray)
        };
    }

    _calculatePitch(audioData) {
        // Implementar detección de pitch usando autocorrelación
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += Math.abs(audioData[i]);
        }
        return sum / audioData.length;
    }

    _calculateToneVariation(audioData) {
        // Calcular variación en el tono para detectar monotonía
        let variations = [];
        for (let i = 1; i < audioData.length; i++) {
            variations.push(Math.abs(audioData[i] - audioData[i-1]));
        }
        return variations.reduce((a, b) => a + b, 0) / variations.length;
    }

    _calculateModulation(audioData) {
        // Analizar modulación de voz para detectar énfasis y expresividad
        let modulationScore = 0;
        const threshold = 0.1;

        for (let i = 1; i < audioData.length; i++) {
            if (Math.abs(audioData[i] - audioData[i-1]) > threshold) {
                modulationScore++;
            }
        }

        return modulationScore / audioData.length;
    }

    _calculateSpeechSpeed(text) {
        const words = text.trim().split(/\s+/).length;
        const duration = (Date.now() - this.lastAnalysis.timestamp) / 1000;
        return words / duration; // palabras por segundo
    }

    _analyzeSpeechClarity(text) {
        // Analizar claridad del habla usando patrones de pronunciación
        const words = text.trim().split(/\s+/);
        let clarity = 0;

        // Verificar longitud promedio de palabras y presencia de muletillas
        const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
        const fillerWords = words.filter(word => 
            ['eh', 'um', 'ah', 'este', 'pues', 'como'].includes(word.toLowerCase())
        ).length;

        clarity = 1 - (fillerWords / words.length);
        clarity *= Math.min(1, avgWordLength / 4);

        return clarity;
    }

    _analyzeVolume() {
        if (!this.analyzer) return null;

        const bufferLength = this.analyzer.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        this.analyzer.getFloatTimeDomainData(dataArray);

        // Calcular RMS del volumen
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);

        return {
            level: rms,
            isOptimal: rms > 0.1 && rms < 0.8
        };
    }

    _calculateConfidenceScore(analysis) {
        const weights = this.config.VOICE_ANALYSIS.emotionWeights;
        let score = 0;

        // Evaluar tono
        if (analysis.tone) {
            score += weights.confidence * (
                0.4 * (1 - Math.abs(analysis.tone.pitch)) +
                0.3 * analysis.tone.variation +
                0.3 * analysis.tone.modulation
            );
        }

        // Evaluar velocidad
        const optimalSpeed = 2.5; // palabras por segundo
        score += weights.clarity * (1 - Math.abs(analysis.speed - optimalSpeed) / optimalSpeed);

        // Evaluar claridad
        score += weights.professionalism * analysis.clarity;

        // Evaluar volumen
        if (analysis.volume && analysis.volume.isOptimal) {
            score += weights.enthusiasm;
        }

        return Math.min(1, Math.max(0, score));
    }

    _generateSpeechFeedback(analysis) {
        let feedback = [];

        // Feedback sobre tono
        if (analysis.tone) {
            if (analysis.tone.variation < 0.2) {
                feedback.push("Tu tono es muy monótono. Intenta agregar más variación para mantener el interés.");
            }
            if (analysis.tone.modulation < 0.3) {
                feedback.push("Podrías enfatizar más las palabras importantes para mejorar tu expresividad.");
            }
        }

        // Feedback sobre velocidad
        if (analysis.speed > 3) {
            feedback.push("Estás hablando muy rápido. Intenta reducir la velocidad para mayor claridad.");
        } else if (analysis.speed < 1.5) {
            feedback.push("Tu ritmo es un poco lento. Podrías aumentar ligeramente la velocidad.");
        }

        // Feedback sobre claridad
        if (analysis.clarity < 0.7) {
            feedback.push("Intenta evitar muletillas y articula más claramente las palabras.");
        }

        // Feedback sobre volumen
        if (analysis.volume && !analysis.volume.isOptimal) {
            if (analysis.volume.level < 0.1) {
                feedback.push("Tu voz es muy baja. Intenta hablar un poco más fuerte.");
            } else if (analysis.volume.level > 0.8) {
                feedback.push("Tu voz es muy alta. Intenta moderar el volumen.");
            }
        }

        return feedback;
    }

    _updateSpeechHistory(analysis) {
        this.speechHistory.push({
            timestamp: Date.now(),
            text: analysis.text,
            scores: {
                confidence: analysis.confidence,
                clarity: analysis.clarity,
                speed: analysis.speed,
                volume: analysis.volume ? analysis.volume.level : null
            }
        });

        // Mantener solo los últimos 5 minutos de historia
        const fiveMinutesAgo = Date.now() - 300000;
        this.speechHistory = this.speechHistory.filter(
            record => record.timestamp > fiveMinutesAgo
        );
    }
}
