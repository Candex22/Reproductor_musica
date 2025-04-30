// Variables globales
let audioContext;
let audioElement;
let audioSource;
let analyser;
let db;
let currentTrackIndex = -1;
let isPlaying = false;
let visualizerBars = [];
let animationFrame;

// Base de datos IndexedDB para almacenar la playlist
function initDatabase() {
    const request = indexedDB.open('AudioPlayerDB', 1);
    
    request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains('playlist')) {
            const store = db.createObjectStore('playlist', { keyPath: 'id', autoIncrement: true });
            store.createIndex('name', 'name', { unique: false });
            store.createIndex('src', 'src', { unique: false });
            
            const playlistStore = event.target.transaction.objectStore('playlist');
            sampleTracks.forEach(track => {
                playlistStore.add(track);
            });
        }
    };
    
    request.onsuccess = (event) => {
        db = event.target.result;
        loadPlaylistFromDB();
    };
    
    request.onerror = (event) => {
        console.error("Error al abrir la base de datos:", event.target.errorCode);
    };
}

// Cargar la playlist desde IndexedDB
function loadPlaylistFromDB() {
    const transaction = db.transaction(['playlist'], 'readonly');
    const store = transaction.objectStore('playlist');
    const request = store.getAll();
    
    request.onsuccess = (event) => {
        const tracks = event.target.result;
        const playlistElement = document.getElementById('playlist');
        playlistElement.innerHTML = ''; // Limpiar la playlist actual
        
        tracks.forEach((track, index) => {
            const trackElement = document.createElement('div');
            trackElement.className = 'playlist-item';
            trackElement.dataset.src = track.src;
            trackElement.dataset.id = track.id;
            trackElement.dataset.index = index;
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = track.name;
            
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'playlist-controls';
            
            const removeButton = document.createElement('button');
            removeButton.className = 'playlist-btn remove-btn';
            removeButton.textContent = '✕';
            removeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                removeTrackFromDB(track.id);
            });
            
            controlsDiv.appendChild(removeButton);
            trackElement.appendChild(nameSpan);
            trackElement.appendChild(controlsDiv);
            
            trackElement.addEventListener('click', () => {
                playTrack(index);
            });
            
            playlistElement.appendChild(trackElement);
        });
    };
    
    request.onerror = (event) => {
        console.error("Error al cargar la playlist:", event.target.errorCode);
    };
}

// Añadir pista a la base de datos
function addTrackToDB(track) {
    const transaction = db.transaction(['playlist'], 'readwrite');
    const store = transaction.objectStore('playlist');
    const request = store.add(track);
    
    request.onsuccess = () => {
        loadPlaylistFromDB();
    };
    
    request.onerror = (event) => {
        console.error("Error al añadir pista:", event.target.errorCode);
    };
}

// Eliminar pista de la base de datos
function removeTrackFromDB(id) {
    const transaction = db.transaction(['playlist'], 'readwrite');
    const store = transaction.objectStore('playlist');
    const request = store.delete(id);
    
    request.onsuccess = () => {
        loadPlaylistFromDB();
    };
    
    request.onerror = (event) => {
        console.error("Error al eliminar pista:", event.target.errorCode);
    };
}

// Inicializar el contexto de audio
function initAudioContext() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    createVisualizer();
}

// Crear el elemento de audio y configurar los eventos
function createAudioElement() {
    audioElement = document.createElement('audio');
    document.body.appendChild(audioElement);
    
    audioElement.addEventListener('timeupdate', updateProgressBar);
    audioElement.addEventListener('ended', () => {
        playNextTrack();
    });
    
    // Conectar el elemento de audio al analizador
    audioSource = audioContext.createMediaElementSource(audioElement);
    audioSource.connect(analyser);
    analyser.connect(audioContext.destination);
}

// Crear las barras del visualizador
function createVisualizer() {
    const visualizerContainer = document.getElementById('visualizer');
    const bufferLength = analyser.frequencyBinCount;
    const barCount = 30; // Número de barras a mostrar
    const barWidth = visualizerContainer.clientWidth / barCount;
    
    for (let i = 0; i < barCount; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        bar.style.left = i * barWidth + 'px';
        bar.style.width = barWidth - 2 + 'px'; // -2 para dejar espacio entre barras
        visualizerContainer.appendChild(bar);
        visualizerBars.push(bar);
    }
}

// Actualizar el visualizador con los datos de frecuencia
function updateVisualizer() {
    if (!isPlaying) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    
    const barCount = visualizerBars.length;
    const step = Math.floor(bufferLength / barCount);
    
    for (let i = 0; i < barCount; i++) {
        let value = 0;
        for (let j = 0; j < step; j++) {
            value += dataArray[i * step + j];
        }
        value = value / step;
        
        const height = (value / 255) * 100;
        visualizerBars[i].style.height = height + '%';
        
        // Cambiar color según la intensidad
        const hue = 120 - (height * 1.2); // De verde a rojo
        visualizerBars[i].style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
    }
    
    animationFrame = requestAnimationFrame(updateVisualizer);
}

// Actualizar la barra de progreso
function updateProgressBar() {
    const progress = (audioElement.currentTime / audioElement.duration) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
}

// Reproducir una pista de la playlist
function playTrack(index) {
    const transaction = db.transaction(['playlist'], 'readonly');
    const store = transaction.objectStore('playlist');
    const request = store.getAll();
    
    request.onsuccess = (event) => {
        const tracks = event.target.result;
        if (index >= tracks.length) return;
        
        currentTrackIndex = index;
        
        // Actualizar la interfaz de la playlist
        const playlistItems = document.querySelectorAll('.playlist-item');
        playlistItems.forEach(item => item.classList.remove('active'));
        playlistItems[index].classList.add('active');
        
        // Actualizar el texto de "Reproduciendo ahora"
        document.getElementById('now-playing').textContent = 'Reproduciendo: ' + tracks[index].name;
        
        // Configurar y reproducir el audio
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        audioElement.src = tracks[index].src;
        audioElement.play();
        isPlaying = true;
        
        // Cambiar el botón de reproducción
        document.getElementById('play').innerHTML = `<?xml version="1.0" encoding="utf-8"?><svg width="10px" height="10px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 5V19M16 5V19" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>`;
        
        // Iniciar la visualización
        updateVisualizer();
    };
}

// Reproducir la siguiente pista
function playNextTrack() {
    const transaction = db.transaction(['playlist'], 'readonly');
    const store = transaction.objectStore('playlist');
    const request = store.count();
    
    request.onsuccess = (event) => {
        const count = event.target.result;
        if (count === 0) return;
        
        let nextIndex = currentTrackIndex + 1;
        if (nextIndex >= count) {
            nextIndex = 0; // Volver al principio si estamos al final
        }
        
        playTrack(nextIndex);
    };
}

// Reproducir la pista anterior
function playPreviousTrack() {
    const transaction = db.transaction(['playlist'], 'readonly');
    const store = transaction.objectStore('playlist');
    const request = store.count();
    
    request.onsuccess = (event) => {
        const count = event.target.result;
        if (count === 0) return;
        
        let prevIndex = currentTrackIndex - 1;
        if (prevIndex < 0) {
            prevIndex = count - 1; // Ir al final si estamos al principio
        }
        
        playTrack(prevIndex);
    };
}

// Reproducir una pista aleatoria
function playRandomTrack() {
    const transaction = db.transaction(['playlist'], 'readonly');
    const store = transaction.objectStore('playlist');
    const request = store.count();
    
    request.onsuccess = (event) => {
        const count = event.target.result;
        if (count === 0) return;
        
        const randomIndex = Math.floor(Math.random() * count);
        playTrack(randomIndex);
    };
}

// Manejar la subida de archivos de audio
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Crear una URL para el archivo
    const fileURL = URL.createObjectURL(file);
    
    // Añadir el archivo a la base de datos
    const track = {
        name: file.name,
        src: fileURL
    };
    
    addTrackToDB(track);
}

// Inicialización cuando la página carga
window.addEventListener('load', function() {
    // Inicializar la base de datos
    initDatabase();
    
    // Inicializar el contexto de audio
    initAudioContext();
    
    // Crear el elemento de audio
    createAudioElement();
    
    // Configurar eventos para los botones de control
    document.getElementById('play').addEventListener('click', function() {
        if (audioElement.paused) {
            if (currentTrackIndex === -1) {
                // Si no hay pista seleccionada, reproducir la primera
                playTrack(0);
            } else {
                // Reanudar la reproducción
                audioElement.play();
                isPlaying = true;
                this.innerHTML = `<?xml version="1.0" encoding="utf-8"?><svg width="10px" height="10px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 5V19M16 5V19" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>`;
                updateVisualizer();
            }
        } else {
            // Pausar la reproducción
            audioElement.pause();
            isPlaying = false;
            this.innerHTML = `<?xml version="1.0" encoding="utf-8"?><svg width="10px" height="10px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M16.6582 9.28638C18.098 10.1862 18.8178 10.6361 19.0647 11.2122C19.2803 11.7152 19.2803 12.2847 19.0647 12.7878C18.8178 13.3638 18.098 13.8137 16.6582 14.7136L9.896 18.94C8.29805 19.9387 7.49907 20.4381 6.83973 20.385C6.26501 20.3388 5.73818 20.0469 5.3944 19.584C5 19.053 5 18.1108 5 16.2264V7.77357C5 5.88919 5 4.94701 5.3944 4.41598C5.73818 3.9531 6.26501 3.66111 6.83973 3.6149C7.49907 3.5619 8.29805 4.06126 9.896 5.05998L16.6582 9.28638Z"
                                    stroke="#000000" stroke-width="2" stroke-linejoin="round" />
                            </svg>`;
            cancelAnimationFrame(animationFrame);
        }
    });
    
    document.getElementById('stop').addEventListener('click', function() {
        audioElement.pause();
        audioElement.currentTime = 0;
        isPlaying = false;
        document.getElementById('play').innerHTML = `<?xml version="1.0" encoding="utf-8"?><svg width="10px" height="10px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M16.6582 9.28638C18.098 10.1862 18.8178 10.6361 19.0647 11.2122C19.2803 11.7152 19.2803 12.2847 19.0647 12.7878C18.8178 13.3638 18.098 13.8137 16.6582 14.7136L9.896 18.94C8.29805 19.9387 7.49907 20.4381 6.83973 20.385C6.26501 20.3388 5.73818 20.0469 5.3944 19.584C5 19.053 5 18.1108 5 16.2264V7.77357C5 5.88919 5 4.94701 5.3944 4.41598C5.73818 3.9531 6.26501 3.66111 6.83973 3.6149C7.49907 3.5619 8.29805 4.06126 9.896 5.05998L16.6582 9.28638Z"
                                    stroke="#000000" stroke-width="2" stroke-linejoin="round" />
                            </svg>`;
        document.getElementById('progressBar').style.width = '0%';
        cancelAnimationFrame(animationFrame);
    });
    
    document.getElementById('next').addEventListener('click', playNextTrack);
    document.getElementById('previous').addEventListener('click', playPreviousTrack);
    document.getElementById('shuffle').addEventListener('click', playRandomTrack);
    
    // Control de volumen
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    
    volumeSlider.addEventListener('input', function() {
        const value = this.value;
        audioElement.volume = value;
        volumeValue.textContent = Math.round(value * 100) + '%';
    });
    
    // Barra de progreso (hacer clic para cambiar posición)
    const progressContainer = document.querySelector('.progress-container');
    progressContainer.addEventListener('click', function(e) {
        if (!audioElement.src) return;
        
        const rect = this.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        audioElement.currentTime = position * audioElement.duration;
    });
    
    // Subida de archivos
    const uploadButton = document.getElementById('upload');
    const fileInput = document.getElementById('fileInput');
    
    uploadButton.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', handleFileUpload);
});
