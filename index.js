const express = require('express');
const multer = require('multer');
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const app = express();

// 配置 multer 存储选项
const storage = multer.memoryStorage();  // 文件存储在内存中，适用于小文件
const upload = multer({ storage: storage });

app.use(express.json());

app.post('/api/messages', upload.none() , (req, res) => {
    console.log(req.body);  // 打印 req.body 查看是否有数据
    res.json({
        message: 'success',
        msg: '我们已经收到您的请求,请求为',
        data: req.body
    });
});

app.get('/', async (req, res) => {
    try {
        const img = await loadImage('https://api.anosu.top/img?sort=setu');
        if (!img) {
            console.error('图片加载失败');
            return res.status(500).send('加载图片失败');
        }

        console.log('图片加载成功');

        // 获取图像处理的大小参数
        const size = Number(req.query.size);
        if (isNaN(size)) {
            console.error('无效的大小参数:', req.query.size);
            return res.status(400).send('无效的大小参数');
        }
        if(size > 100) {
            console.error('大小参数超出范围');
            return res.status(400).send('大小参数超出范围');
        }

        const processedImageData = await processImage(img, size);

        // 返回处理后的图像数据（base64 编码）
        res.json({ url: processedImageData });
    } catch (error) {
        // 捕获所有其他错误，并输出错误信息
        res.status(500).send('服务器内部错误');
    }
});



// 处理图像并应用圆形像素效果
async function processImage(img, circleRadius) {
    try {
        console.log(circleRadius);
        console.log('Processing image with canvas...');
        // 创建一个 Canvas 实例并设置图像的尺寸
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');

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

        // 返回处理后的图像数据（去掉前缀的 base64 编码）
        console.log('成功');
        return base64Str;
    } catch (err) {
        console.error('Error in image processing:', err.message);
        throw new Error('Image processing failed');
    }
}

// 获取指定位置像素的颜色
function getPixelColor(imageData, x, y, imgWidth) {
    const index = (y * imgWidth + x) * 4;
    const r = imageData.data[index];
    const g = imageData.data[index + 1];
    const b = imageData.data[index + 2];
    return `rgb(${r}, ${g}, ${b})`;  // 修正了这个错误
}

// 启动服务
const port = 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Node.js API running on http://localhost:${port}`);
});
