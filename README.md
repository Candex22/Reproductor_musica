# Reproductor de Audio Web

Este proyecto es un reproductor de audio web completo con visualización de audio, gestión de listas de reproducción y almacenamiento persistente. La aplicación permite a los usuarios subir y reproducir archivos de audio, visualizar las frecuencias de audio en tiempo real, y gestionar una lista de reproducción personalizada.

## Características

- 🎵 Reproductor de audio con controles completos (reproducir, pausar, detener, anterior, siguiente)
- 📊 Visualizador de audio en tiempo real con barras de frecuencia dinámicas
- 📂 Carga de archivos de audio desde el dispositivo del usuario
- 📋 Lista de reproducción persistente usando IndexedDB
- 🔄 Modo aleatorio para reproducción aleatoria de pistas
- 📱 Diseño responsive adaptable a diferentes dispositivos
- 🎚️ Control de volumen interactivo

## Tecnologías utilizadas

- **HTML5**: Estructura base y elementos multimedia
- **CSS3**: Estilizado y diseño responsive
- **JavaScript**: Lógica del reproductor y manipulación del DOM
- **Web Audio API**: Análisis de frecuencia y visualización de audio
- **IndexedDB**: Almacenamiento persistente de la lista de reproducción
- **SVG**: Iconos para los controles del reproductor

## Estructura del proyecto

El proyecto está organizado en tres archivos principales:

- `index.html`: Estructura de la página y elementos UI
- `style.css`: Estilos y diseño responsive
- `script.js`: Toda la lógica del reproductor de audio

## Cómo funciona

### Inicialización

Al cargar la página, el reproductor inicializa:

1. Una base de datos IndexedDB para almacenar la lista de reproducción
2. El contexto de audio y el analizador para procesar el audio
3. El elemento de audio para la reproducción
4. Los eventos para todos los controles del reproductor

### Audio y visualización

El reproductor utiliza la Web Audio API para:

- Crear un contexto de audio (`AudioContext`)
- Configurar un nodo analizador (`AnalyserNode`) para analizar las frecuencias
- Conectar el elemento de audio al analizador y al destino de salida
- Generar una visualización en tiempo real basada en los datos de frecuencia

```javascript
// Inicializar el contexto de audio
function initAudioContext() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    createVisualizer();
}
```

El visualizador utiliza `requestAnimationFrame` para actualizar continuamente la altura y el color de las barras basándose en los datos de frecuencia del audio en reproducción:

```javascript
function updateVisualizer() {
    if (!isPlaying) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    
    // Actualizar altura y color de cada barra...
    
    animationFrame = requestAnimationFrame(updateVisualizer);
}
```

### Almacenamiento persistente

El reproductor utiliza IndexedDB para almacenar la lista de reproducción, permitiendo que persista entre sesiones:

```javascript
function initDatabase() {
    const request = indexedDB.open('AudioPlayerDB', 1);
    
    request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains('playlist')) {
            const store = db.createObjectStore('playlist', { keyPath: 'id', autoIncrement: true });
            // Configuración adicional...
        }
    };
    
    // Manejo de éxito y error...
}
```

### Gestión de la lista de reproducción

La lista de reproducción se carga desde la base de datos y se muestra en la interfaz:

```javascript
function loadPlaylistFromDB() {
    const transaction = db.transaction(['playlist'], 'readonly');
    const store = transaction.objectStore('playlist');
    const request = store.getAll();
    
    request.onsuccess = (event) => {
        const tracks = event.target.result;
        // Generar elementos de la lista de reproducción...
    };
}
```

Los usuarios pueden:
- Añadir nuevas pistas subiendo archivos de audio
- Eliminar pistas de la lista de reproducción
- Seleccionar pistas para reproducción inmediata

### Controles del reproductor

El reproductor ofrece controles completos:

- **Reproducir/Pausar**: Alterna entre reproducir y pausar la pista actual
- **Detener**: Detiene la reproducción y reinicia la posición
- **Anterior/Siguiente**: Navega entre las pistas de la lista de reproducción
- **Aleatorio**: Selecciona una pista aleatoria para reproducir
- **Control de volumen**: Ajusta el volumen de reproducción
- **Barra de progreso**: Muestra el progreso de la reproducción y permite saltar a cualquier posición

## Cómo usar

1. Abre `index.html` en un navegador web moderno
2. Utiliza el botón "Subir canción" para añadir archivos de audio a la lista de reproducción
3. Haz clic en cualquier pista de la lista para comenzar a reproducirla
4. Utiliza los controles del reproductor para gestionar la reproducción
5. Ajusta el volumen según sea necesario
6. Observa el visualizador para ver una representación gráfica de las frecuencias de audio

## Aspectos técnicos destacables

### Web Audio API

El proyecto utiliza la Web Audio API para crear una experiencia de audio rica:

```javascript
audioSource = audioContext.createMediaElementSource(audioElement);
audioSource.connect(analyser);
analyser.connect(audioContext.destination);
```

### Manejo de archivos

El reproductor permite subir archivos de audio y convertirlos en URLs para reproducción:

```javascript
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Crear una URL para el archivo
    const fileURL = URL.createObjectURL(file);
    
    // Añadir a la base de datos...
}
```

### Visualización en tiempo real

El visualizador analiza y muestra los datos de frecuencia en tiempo real:

```javascript
const dataArray = new Uint8Array(bufferLength);
analyser.getByteFrequencyData(dataArray);

// Procesar datos para la visualización...
```

## Posibles mejoras futuras

- Implementar ecualizador con ajustes de banda
- Añadir soporte para cargar listas de reproducción desde servicios externos
- Integrar funcionalidad de búsqueda y filtrado para la lista de reproducción
- Añadir soporte para metadatos de audio (artista, álbum, etc.)
- Implementar temas visuales personalizables
- Añadir visualizaciones alternativas (forma de onda, espectrograma, etc.)


Creado con 🩸, 😅 y 😭 utilizando HTML, CSS y JavaScript.
