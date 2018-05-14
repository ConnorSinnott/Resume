const fs = require('fs-extra');
const express = require('express');
const reload = require('reload');
const pug = require('pug');
const path = require('path');
const sass = require('node-sass');

const arg = process.argv[2];

if (!arg) {

    const app = express();
    app.use('/', express.static('build'));
    app.listen(3000);

    const reloadServer = reload(app);

    console.log('Development server running');
    fs.watch('./src', (eventType, filename) => {

        if (eventType === 'rename' && path.extname(filename) === '.pug') {
            const files = fs.readdirSync('./src');
            files.forEach(f => {
                if (path.extname(f) === '.pug') {
                    console.log(f);
                    const result = pug.renderFile(`./src/${f}`);
                    fs.writeFileSync(`./build/${f.slice(0, -4)}.html`, result);

                }
            });
            reloadServer.reload();
        }

    });

    fs.watch('./src/public/stylesheets', (eventType, filename) =>{

        if (eventType === 'rename' && path.extname(filename) === '.scss') {
            sass.render({
                file: `./src/public/stylesheets/${filename}`
            }, (err, result) => {
                if(!err) {
                    fs.writeFile(`./build/public/stylesheets/${filename.slice(0, -5)}.css`, result.css, (err, result) => {
                        console.log('reload');
                        reloadServer.reload();
                    });
                } else {
                    console.log(err);
                }
            });
        }

    });

} else {

    if (arg === 'init') {

        fs.removeSync('./build');
        fs.mkdirSync('./build');
        fs.copySync('./src/public', './build/public');
        fs.removeSync('./build/public/stylesheets');
        fs.mkdirSync('./build/public/stylesheets');

        const scssFiles = fs.readdirSync('./src/public/stylesheets');
        scssFiles.forEach(f => {
            const result = sass.renderSync({
                file: `./src/public/stylesheets/${f}`,
            });
            fs.writeFileSync(`./build/public/stylesheets/${f.slice(0, -5)}.css`, result.css.toString());
        });

        const files = fs.readdirSync('./src');
        files.forEach(f => {
            if (path.extname(f) === '.pug') {
                console.log(f);
                const result = pug.renderFile(`./src/${f}`);
                fs.writeFile(`./build/${f.slice(0, -4)}.html`, result, (err, result) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(`Rendered ${f}`);
                    }
                });
            }
        });
    }

}


