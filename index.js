const express = require('express');
const multer = require('multer');
const { createCanvas, loadImage } = require('canvas');
const app = express();

// 配置 multer 存储选项
const storage = multer.memoryStorage();  // 文件存储在内存中，适用于小文件
const upload = multer({ storage: storage });

app.use(express.json());

// 设定请求超时（例如 30 秒）
const REQUEST_TIMEOUT = 30000;

app.post('/api/messages', upload.none(), (req, res) => {
    console.log(req.body);  // 打印 req.body 查看是否有数据
    res.json({
        message: 'success',
        msg: '我们已经收到您的请求,请求为',
        data: req.body
    });
});

app.get('/', async (req, res) => {
    try {
        const img = await loadImageWithTimeout('https://api.anosu.top/img?sort=setu', REQUEST_TIMEOUT);

        // 获取图像处理的大小参数
        let size = Number(req.query.size);
        if (isNaN(size)) {
            size = 10;
        }
        if (size > 100) {
            console.error('大小参数超出范围');
            return res.status(400).send('大小参数超出范围');
        }

        const processedImageData = await processImage(img, size , 1000);

        // 返回处理后的图像数据（base64 编码）
        res.json({ url: processedImageData });
    } catch (error) {
        console.error(error);
        res.status(500).send('服务器内部错误');
    }
});

// 为图片加载设置超时
async function loadImageWithTimeout(url, timeout) {
    return Promise.race([
        loadImage(url),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('图片加载超时')), timeout)
        )
    ]);
}

// 处理图像并应用圆形像素效果
async function processImage(img, circleRadius, timeout) {
    try {
        console.log(circleRadius);
        console.log('Processing image with canvas...');

        // 创建一个 Canvas 实例并设置图像的尺寸
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');

        // 创建一个 Promise 来处理超时
        const processPromise = new Promise(async (resolve, reject) => {
            // 绘制图像到 Canvas 上
            ctx.drawImage(img, 0, 0);

            // 获取图像的像素数据
            const imageData = ctx.getImageData(0, 0, img.width, img.height);

            // 清空画布，准备进行圆形像素化处理
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 对图像进行圆形像素化处理
            for (let y = 0; y < img.height; y += circleRadius * 2) {
                for (let x = 0; x < img.width; x += circleRadius * 2) {
                    const pixelColor = getPixelColor(imageData, x, y, img.width);

                    // 绘制圆形
                    ctx.beginPath();
                    ctx.arc(x + circleRadius, y + circleRadius, circleRadius, 0, Math.PI * 2);
                    ctx.fillStyle = pixelColor;
                    ctx.fill();
                    ctx.closePath();
                }
            }

            console.log('Image processed');

            // 获取 base64 编码的图像数据，去除前缀
            const base64Data = canvas.toDataURL('image/png');
            const base64Str = base64Data.replace(/^data:image\/png;base64,/, ''); // 去除前缀
            resolve(base64Str);
        });

        // 创建超时处理的 Promise
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('图像处理超时')), timeout)
        );

        // 使用 Promise.race 竞态条件，先完成的 Promise 会被执行
        return await Promise.race([processPromise, timeoutPromise]);

    } catch (err) {
        console.error('Error in image processing:', err.message);
        throw new Error('Image processing failed');
    }
}

// 你可以在调用 `processImage` 时传递一个 `timeout` 参数，单位为毫秒（例如，超时设置为 10 秒）


// 获取指定位置像素的颜色
function getPixelColor(imageData, x, y, imgWidth) {
    const index = (y * imgWidth + x) * 4;
    const r = imageData.data[index];
    const g = imageData.data[index + 1];
    const b = imageData.data[index + 2];
    return `rgb(${r}, ${g}, ${b})`;
}

// 启动服务
const port = 3000;

app.listen(port, '0.0.0.0', () => {
    console.log(`Node.js API running on http://localhost:${port}`);
});
