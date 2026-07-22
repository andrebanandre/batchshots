/**
 * OpenCV.js Loader Script
 * Loads the OpenCV 5 build (with DNN module) from R2 and dispatches
 * an 'opencv-ready' event once the runtime is fully initialized.
 */

// Create a status element to show loading progress
const statusElement = document.createElement('div');
statusElement.id = 'opencv-status';
statusElement.style.position = 'fixed';
statusElement.style.top = '0';
statusElement.style.left = '0';
statusElement.style.right = '0';
statusElement.style.padding = '5px';
statusElement.style.background = 'black';
statusElement.style.color = 'white';
statusElement.style.fontSize = '12px';
statusElement.style.textAlign = 'center';
statusElement.style.zIndex = '9999';
statusElement.style.display = 'none';
document.body.appendChild(statusElement);

// Function to update status
function updateStatus(message) {
  // statusElement.textContent = message;
  // statusElement.style.display = 'block';
  console.log(message);
}

// Function to hide status
function hideStatus() {
  setTimeout(() => {
    statusElement.style.display = 'none';
  }, 2000);
}

// OpenCV.js loading status and callback
function onOpenCvReady() {
  updateStatus('Ready to process your images!');
  hideStatus();

  // Dispatch an event when OpenCV is ready
  window.dispatchEvent(new Event('opencv-ready'));
}

function loadOpenCV() {
  if (window.cv && typeof window.cv.imread === 'function') {
    onOpenCvReady();
    return;
  }

  updateStatus('Loading image processing...');

  const script = document.createElement('script');
  script.setAttribute('async', '');
  script.setAttribute('type', 'text/javascript');

  // Public R2-hosted OpenCV 5 build (includes the DNN module)
  script.setAttribute('src', 'https://s3.batchshots.com/js/opencv/opencv-5.0.0.js');

  script.onload = () => {
    // The UMD factory may set window.cv to either the module itself
    // (ready after onRuntimeInitialized) or a thenable resolving to it.
    const cvGlobal = window.cv;
    if (cvGlobal && typeof cvGlobal.then === 'function') {
      cvGlobal.then((resolved) => {
        // Remove the Emscripten module's self-referential `then` so that
        // `await window.cv` elsewhere can't unwrap recursively and hang.
        try { delete resolved.then; } catch (e) { /* sealed — fine */ }
        window.cv = resolved;
        onOpenCvReady();
      });
      return;
    }
    // Otherwise poll until the runtime has registered its API
    const checkCv = () => {
      if (window.cv && typeof window.cv.imread === 'function') {
        onOpenCvReady();
      } else {
        setTimeout(checkCv, 50);
      }
    };
    checkCv();
  };
  script.onerror = () => {
    updateStatus('Failed to load OpenCV.js. Please refresh the page.');
  };

  document.body.appendChild(script);
}

// Start loading OpenCV.js when the page is fully loaded
if (document.readyState === 'complete') {
  loadOpenCV();
} else {
  window.addEventListener('load', loadOpenCV);
}
