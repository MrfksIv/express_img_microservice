const express = require('express');
const sharp = require('sharp');
const bodyparser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();

app.param('image', (req, res, next, image) => {
    if (!image.match(/\.(png|jpg)$/i)) {
        return res.status(req.method === 'POST' ? 403 : 404).end();
    }
    req.image = image;
    req.localpath = path.join(__dirname, 'uploads', req.image);
    return next();
});


app.post('/uploads/:image', bodyparser.raw({
    limit   : '10mb',
    type    : 'image/*'  
}), (req, res) => {
    const fd = fs.createWriteStream(req.localpath, {
        flags : 'w+',
        encoding: 'binary'
    });

    fd.end(req.body);
    fd.on('close', () => res.send({status: 'ok', size: len}));
});

app.get('/uploads/:image',download_image);

function download_image(req, res) {
    fs.access(req.localpath, fs.constants.R_OK , (err) => {
        if (err) return res.status(404).end();

        let image     = sharp(req.localpath);
        let width     = +req.query.width;
        let height    = +req.query.height;
        let greyscale = [ 'y', 'yes', '1', 'on'].includes(req.query.greyscale);
        let blur      = +req.query.blur;
        let sharpen   = +req.query.sharpen;
        let flip      = [ 'y', 'yes', '1', 'on'].includes(req.query.flip);
        let flop      = [ 'y', 'yes', '1', 'on'].includes(req.query.flop);

        if (width > 0 && height > 0) {
            image.ignoreAspectRatio();
        }

        if (flip) {
            image.flip();
        }

        if (flop) {
            image.flop();
        }

        if (greyscale) {
            image.greyscale();
        }

        if (blur > 0) {
            image.blur(blur);
        }

        if (sharpen > 0) {
            image.sharpen(sharpen);
        }

        if (width > 0 || height > 0) {
            image.resize(width || null, height || null);
        }

        res.setHeader('Content-Type', 'image/' + 
        path.extname(req.image).substr(1));

        image.pipe(res);
    });
}




app.get(/\/thumbnail\.(jpg|png)/, (req, res, next) => {
    console.log(req.query);

    let format      = req.params[0] === 'png' ? 'png' : 'jpeg';
    let width       = Number(req.query.width) || 300;
    let height      = Number(req.query.height) || 200;
    let border      = Number(req.query.border) || 5;
    let bgcolor     = req.query.bgcolor || '#fcfcfc';
    let fgcolor     = req.query.fgcolor || '#ddd';
    let textcolor   = req.query.textcolor || '#aaa';
    let textsize    = Number(req.query.textsize) || 24;

    console.log(width, height);
    let image;

    image = sharp({
        create: {
            width       : width,
            height      : height,
            channels    : 4,
            background  : {r: 0, g: 0, b: 0}
        }
    });

    const thumbnail = new Buffer.from(
`<svg width="${width}" height="${height}">
        <rect
            x="0" y="0"
            width="${width}" height="${height}"
            fill="${fgcolor}" />
        <rect
            x="${border}" y="${border}"
            width="${width - border * 2}" height="${height - border * 2}"
            fill="${bgcolor}" />
        <line
            x1="${border * 2}" y1="${border * 2}"
            x2="${width - border * 2}" y2="${height - border * 2}"
            stroke-width="${border}" stroke="${fgcolor}" />
        <line
            x1="${width - border * 2}" y1="${border * 2}"
            x2="${border * 2}" y2="${height - border * 2}"
            stroke-width="${border}" stroke="${fgcolor}" />
        <rect
            x="${border}" y="${(height - textsize) / 2}"
            width="${width - border * 2}" height="${textsize}"
            fill="${bgcolor}" />
        <text
            x="${width / 2}" y="${height / 2}" dy="8"
            font-family="Helvetica" font-size="${textsize}"
            fill="${textcolor}" text-anchor="middle">${width} x ${height}</text>
</svg>`
    );

    image.overlayWith(thumbnail)[format]().pipe(res);
});




port = process.argv[2] && parseInt(process.argv[2]) || 3000;
app.listen(port, () => console.log(`listening on port ${port}`))

