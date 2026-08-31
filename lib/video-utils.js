// 𝗕𝗢𝗧 𝗡𝗔𝗠𝗘 ➳ 𝗚𝗟𝗢𝗥𝗜𝗔 𝗠𝗗
// 𝗕𝗢𝗧 𝗗𝗘𝗩 ➳ 𝗠𝗥 𝗥𝗢𝗔𝗡
//𝗖𝗢𝗡𝗧𝗔𝗖𝗧 𝗗𝗘𝗩 ➳ +237689301479
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function videoToWebp(buffer) {
    return new Promise((resolve, reject) => {
        const inputPath = path.join(os.tmpdir(), `input_${Date.now()}.mp4`);
        const outputPath = path.join(os.tmpdir(), `output_${Date.now()}.webp`);
        fs.writeFileSync(inputPath, buffer);
        exec(`ffmpeg -i "${inputPath}" -vcodec libwebp -filter:v fps=fps=15 -lossless 1 -y "${outputPath}"`, (err) => {
            fs.unlinkSync(inputPath);
            if (err) return reject(err);
            const webpBuffer = fs.readFileSync(outputPath);
            fs.unlinkSync(outputPath);
            resolve(webpBuffer);
        });
    });
}

// New function for images
function imageToWebp(buffer) {
    return new Promise((resolve, reject) => {
        const inputPath = path.join(os.tmpdir(), `input_${Date.now()}.png`);
        const outputPath = path.join(os.tmpdir(), `output_${Date.now()}.webp`);
        fs.writeFileSync(inputPath, buffer);
        exec(`ffmpeg -i "${inputPath}" -vcodec libwebp -lossless 1 -qscale 75 -y "${outputPath}"`, (err) => {
            fs.unlinkSync(inputPath);
            if (err) return reject(err);
            const webpBuffer = fs.readFileSync(outputPath);
            fs.unlinkSync(outputPath);
            resolve(webpBuffer);
        });
    });
}

module.exports = {
    videoToWebp,
    imageToWebp
};
