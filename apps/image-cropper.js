/**
 * Image Cropper Application
 * 
 * Purpose: Interactive image cropping tool with drag-to-select functionality
 * 
 * Main Methods:
 * - handleImageUpload(): Loads image from file input
 * - startCrop(): Initiates crop selection on mousedown
 * - updateCrop(): Updates crop area during mouse drag
 * - endCrop(): Finalizes crop selection on mouseup
 * - updatePreview(): Renders cropped area preview
 * - downloadCropped(): Downloads the cropped image
 * - resetCrop(): Clears crop selection
 * - clearImage(): Removes loaded image
 */

function imageCropper() {
return {
isDark: localStorage.getItem('theme') === 'dark' || true,
isFullscreen: false,
imageLoaded: false,
isCropping: false,
image: null,
cropRect: null,
startPoint: null,

init() {
if (this.isDark) {
document.documentElement.classList.add('dark');
}
},

toggleTheme() {
this.isDark = !this.isDark;
localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
if (this.isDark) {
document.documentElement.classList.add('dark');
} else {
document.documentElement.classList.remove('dark');
}
},

toggleFullscreen() {
this.isFullscreen = !this.isFullscreen;
if (this.isFullscreen) {
document.documentElement.requestFullscreen?.();
} else {
document.exitFullscreen?.();
}
},

handleImageUpload(event) {
const file = event.target.files[0];
if (!file) return;

const reader = new FileReader();
reader.onload = (e) => {
this.image = new Image();
this.image.onload = () => {
this.imageLoaded = true;
this.$nextTick(() => {
this.drawImage();
});
};
this.image.src = e.target.result;
};
reader.readAsDataURL(file);
},

drawImage() {
const canvas = this.$refs.canvas;
if (!canvas || !this.image) return;

const ctx = canvas.getContext('2d');
const maxWidth = 800;
const maxHeight = 600;
let width = this.image.width;
let height = this.image.height;

if (width > maxWidth) {
height = (height * maxWidth) / width;
width = maxWidth;
}
if (height > maxHeight) {
width = (width * maxHeight) / height;
height = maxHeight;
}

canvas.width = width;
canvas.height = height;
ctx.drawImage(this.image, 0, 0, width, height);
},

startCrop(event) {
const rect = this.$refs.canvas.getBoundingClientRect();
this.startPoint = {
x: event.clientX - rect.left,
y: event.clientY - rect.top
};
this.isCropping = true;
this.cropRect = {
x: this.startPoint.x,
y: this.startPoint.y,
width: 0,
height: 0
};
},

updateCrop(event) {
if (!this.isCropping || !this.startPoint) return;

const rect = this.$refs.canvas.getBoundingClientRect();
const currentX = event.clientX - rect.left;
const currentY = event.clientY - rect.top;

const width = currentX - this.startPoint.x;
const height = currentY - this.startPoint.y;

this.cropRect = {
x: width >= 0 ? this.startPoint.x : currentX,
y: height >= 0 ? this.startPoint.y : currentY,
width: Math.abs(width),
height: Math.abs(height)
};

this.updatePreview();
},

endCrop(event) {
if (!this.isCropping) return;
this.isCropping = false;

if (this.cropRect && (this.cropRect.width < 5 || this.cropRect.height < 5)) {
this.cropRect = null;
return;
}

this.updatePreview();
},

updatePreview() {
if (!this.cropRect || !this.$refs.previewCanvas) return;

const canvas = this.$refs.canvas;
const previewCanvas = this.$refs.previewCanvas;
const ctx = canvas.getContext('2d');
const previewCtx = previewCanvas.getContext('2d');

const imageData = ctx.getImageData(
this.cropRect.x,
this.cropRect.y,
this.cropRect.width,
this.cropRect.height
);

previewCanvas.width = this.cropRect.width;
previewCanvas.height = this.cropRect.height;
previewCtx.putImageData(imageData, 0, 0);
},

downloadCropped() {
if (!this.$refs.previewCanvas || !this.cropRect) return;

this.$refs.previewCanvas.toBlob((blob) => {
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `cropped-image-${Date.now()}.png`;
a.click();
URL.revokeObjectURL(url);
});
},

resetCrop() {
this.cropRect = null;
this.startPoint = null;
this.isCropping = false;
},

clearImage() {
this.imageLoaded = false;
this.image = null;
this.cropRect = null;
this.startPoint = null;
this.isCropping = false;
const fileInput = document.getElementById('imageInput');
if (fileInput) fileInput.value = '';
}
};
}
