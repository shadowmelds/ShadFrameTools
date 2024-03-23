const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// 使用示例：node shadmockup.js --screenshot=1.png --mockup=studiodisplay1920_1080.png --background=background@3840-2560.png --top 90 --bottom 90

async function main() {
    const args = require('minimist')(process.argv.slice(2));

    // 参数：圆角
    const radius = typeof args['radius'] !== "undefined" ? args['radius'] : 16;
    // 参数：质量
    const quality = typeof args['quality'] !== "undefined" ? args['quality'] : -1;
    // 参数：保存文件名
    const save = typeof args['save'] !== "undefined" ? args['save'] : "output.png";
    // 参数：顶部偏移
    const top = typeof args['top'] !== "undefined" ? args['top'] : -1;

    const mockupInput = sharp(args['mockup'])
    const screenshotInput = sharp(args['screenshot'])
    const mockupMetadata = await mockupInput.metadata()
    const screenshotMetadata = await screenshotInput.metadata()

    // 剪贴蒙版出截图的圆角
    const rect = new Buffer(
        `<svg><rect x="0" y="0" width="${screenshotMetadata.width}" height="${screenshotMetadata.height}" rx="${radius}" ry="${radius}"/></svg>`
    );
    const roundedCornersBuffer = await screenshotInput
        .composite([{input: new Buffer.from(rect), blend: 'dest-in'}]).toBuffer()

    // 合成设备框
    const mockupBuffer = await mockupInput.toBuffer()

    const addMockup = await sharp({
        create: {
            width: mockupMetadata.width,
            height: mockupMetadata.height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    }).composite([
            {input: mockupBuffer, gravity: 'center', blend: 'over'},
            top === -1
            ? {input: roundedCornersBuffer, gravity: 'center', blend: 'over'}
            : {input: roundedCornersBuffer, left: args['left'], top: args['top'], gravity: 'center', blend: 'over'}
    ])

    // 合成背景图像（如果有指定）
    if (typeof args['background'] !== "undefined") {

        const backgroundBuffer = await sharp(args['background'])
            .resize({width: mockupMetadata.width, height: mockupMetadata.height, fit: sharp.fit.cover})
            .toBuffer()
        const addMockupBuffer = await addMockup.clone().png().toBuffer()

        const addBackground = await sharp({
            create: {
                width: mockupMetadata.width,
                height: mockupMetadata.height,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        }).composite([
            {input: backgroundBuffer, gravity: 'center', blend: 'over'},
            {input: addMockupBuffer, gravity: 'center', blend: 'over'},
        ])

        // 输出带背景的图像文件
        await compressSaveImage(quality, addBackground, save)
    } else {
        // 输出不带背景的图像文件
        await compressSaveImage(quality, addMockup, save)
    }
}

// 输出最终图像文件
async function compressSaveImage(quality, sharpObject, fileName) {

    // 压缩图片（如果有指定）
    if (quality !== -1) {
        await sharpObject.png({ quality: quality, speed: 1}).toFile(fileName)
    } else {
        await sharpObject.toFile(fileName)
    }

}

main().then(r => {console.log('done.')})