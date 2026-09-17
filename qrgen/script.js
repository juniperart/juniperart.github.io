const textInput = document.getElementById('text');
const sizeSelect = document.getElementById('size');
const correctLevelSelect = document.getElementById('correctLevel');
const colorDarkInput = document.getElementById('colorDark');
const colorLightInput = document.getElementById('colorLight');
const qrContainer = document.getElementById('qrcode');
const downloadButton = document.getElementById('download');

let qrcode = null;

function render() {
    const text = textInput.value.trim();

    qrContainer.innerHTML = '';

    if (!text) {
        downloadButton.disabled = true;
        return;
    }

    const size = parseInt(sizeSelect.value, 10);

    qrcode = new QRCode(qrContainer, {
        text: text,
        width: size,
        height: size,
        colorDark: colorDarkInput.value,
        colorLight: colorLightInput.value,
        correctLevel: QRCode.CorrectLevel[correctLevelSelect.value]
    });

    downloadButton.disabled = false;
}

function download() {
    const canvas = qrContainer.querySelector('canvas');
    if (!canvas) {
        return;
    }

    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

[textInput, sizeSelect, correctLevelSelect, colorDarkInput, colorLightInput].forEach((el) => {
    el.addEventListener('input', render);
});

downloadButton.addEventListener('click', download);

downloadButton.disabled = true;
