const fs = require('fs-extra');
const express = require('express');
const reload = require('reload');
const pug = require('pug');
const path = require('path');
const sass = require('node-sass');
const watch = require('node-watch');

const PROCESS_ARGS = process.argv.slice(2) || null;
switch (PROCESS_ARGS[0]) {
    case 'render': {
        render();
        break;
    }
    case 'develop': {
        develop();
        break;
    }
    case 'deploy': {
        break;
    }
    default: {
        console.log('Usage:');
        console.log('- node main.js render');
        console.log('   Perform a complete render of the website');
        console.log('   Output in ./build folder');
        console.log('- node main.js develop');
        console.log('   Launches a development server on port 3000');
        console.log('   Watches for file changes and re-renders the website');
        console.log('   (Designed for use with JetBrains IDEs)');
        break;
    }
}

/**
 * Do a complete render of the website
 * Overwrites the entire build folder
 */
function render() {

    return fs.remove('./build') // Remove the old build folder with contents
        .then(() => fs.mkdir('./build')) // Create a new build folder
        .then(() => fs.copy('./src/public', './build/public')) // Copy over the public assets
        .then(() => fs.remove('./build/public/stylesheets')) // Delete the stylesheets (SCSS)
        .then(() => fs.mkdir('./build/public/stylesheets')) // Create an empty stylesheets folder (CSS)
        .then(() => fs.readdir('./src/public/stylesheets')) // Read the SCSS dir
        .then(scssDir => Promise.all(scssDir.map(f => { // Convert SCSS to CSS write to build
            const result = sass.renderSync({
                file: `./src/public/stylesheets/${f}`,
            });
            console.log(`Rendered ${f}`);
            return fs.writeFile(
                `./build/public/stylesheets/${f.slice(0, -5)}.css`,
                result.css.toString());
        }))) //
        .then(() => fs.readdir('./src')) // Read the src dir (pug files)
        .then((pugDir) => Promise.all(pugDir.map(f => { // Convert PUG to HTML and write to build
            if (path.extname(f) === '.pug') {
                const result = pug.renderFile(`./src/${f}`);
                return fs.writeFile(`./build/${f.slice(0, -4)}.html`, result).
                    then(() => {
                        console.log(`Rendered ${f}`);
                    });
            } else {
                return null;
            }
        })))

}

/**
 * Enables the development server on port 3000
 * Does an initial render before deploying the server
 */
function develop() {

    // Perform an initial render
    render().then(() => { // Deploy server

        console.log('Development server started');

        const app = express();
        app.use('/', express.static('build'));
        app.listen(3000);

        const reloadServer = reload(app);

        const watcher = watch('./src', {recursive: true});

        function _watch() { // Wait for previous render to complete before adding back change listener
            watcher.once('change', (event, name) => {
                console.log(`${name} triggered render`);
                render().then(() => {
                    reloadServer.reload();
                    _watch();
                });
            });
        }

        _watch();

    });

}
