/**
 * OpenCV.js Loader Script
 * This script loads OpenCV.js from CDN and sets up a status indicator.
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
  if (window.cv) {
    onOpenCvReady();
    return;
  }
  
  updateStatus('Loading image processing...');
  
  const script = document.createElement('script');
  script.setAttribute('async', '');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', 'https://docs.opencv.org/4.7.0/opencv.js');
  script.onload = () => {
    // Check if cv object exists and has imread method
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