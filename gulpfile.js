'use strict';

const gulp = require('gulp'),
    babel = require('gulp-babel'),
    concat = require('gulp-concat'),
    cleancss = require('gulp-clean-css'),
    uglify = require('gulp-uglify-es').default,
    sass = require('gulp-sass')(require('node-sass')),
    clean = require('gulp-clean'),
    purgecss = require('gulp-purgecss'),
    rename = require('gulp-rename'),
    merge = require('merge-stream'),
    injectstring = require('gulp-inject-string'),
    bundleconfig = require('./bundleconfig.json'),
    fs = require('fs');

const editFilePartial = 'Edit this file at https://github.com/chocolatey/choco-theme/partials';
const { series, parallel, src, dest, watch } = require('gulp');

const regex = {
    css: /\.css$/,
    js: /\.js$/
};

const paths = {
    input: 'input/',
    assets: 'input/assets/',
    partials: 'input/global-partials',
    node_modules: 'node_modules/',
    theme: 'node_modules/choco-theme/'
};

const getBundles = (regexPattern) => {
    return bundleconfig.filter(bundle => {
        return regexPattern.test(bundle.outputFileName);
    });
};

function del() {
    return src([
        paths.assets + 'css',
        paths.assets + 'js',
        paths.assets + 'fonts',
        paths.assets + 'images/global-shared',
        paths.partials
    ], { allowEmpty: true })
        .pipe(clean({ force: true }));
}

function copyTheme() {
    var copyFontAwesome = src(paths.node_modules + '@fortawesome/fontawesome-free/webfonts/*.*')
        .pipe(dest(paths.assets + 'fonts/fontawesome-free'));

    var copyPartials = src(paths.theme + 'partials/ThemeToggle.txt')
        .pipe(injectstring.prepend('@* ' + editFilePartial + ' *@\n'))
        .pipe(injectstring.replace(/<input id=\"themeToggle\" \/>/, fs.readFileSync(paths.theme + 'partials/ThemeToggle.txt')))
        .pipe(injectstring.replace(/﻿/, ''))
        .pipe(rename({ prefix: "_", extname: '.cshtml' }))
        .pipe(dest(paths.partials));

    return merge(copyFontAwesome, copyPartials);
}

function compileSass() {
    return src(paths.theme + 'scss/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(dest(paths.assets + 'css'));
}

function compileJs() {
    var tasks = getBundles(regex.js).map(function (bundle) {

        return gulp.src(bundle.inputFiles, { base: '.' })
            .pipe(babel({
                "sourceType": "unambiguous",
                "presets": [
                    ["@babel/preset-env", {
                        "targets": {
                            "ie": "10"
                        }
                    }
                  ]]
            }))
            .pipe(concat(bundle.outputFileName))
            .pipe(injectstring.replace('input-validation-error', 'input-validation-error is-invalid'))
            .pipe(injectstring.replace('field-validation-error', 'field-validation-error invalid-feedback'))
            .pipe(dest('.'));
    });

    return merge(tasks);
}

function compileCss() {
    var tasks = getBundles(regex.css).map(function (bundle) {

        return gulp.src(bundle.inputFiles, { base: '.' })
            .pipe(concat(bundle.outputFileName))
            .pipe(gulp.dest('.'));
    });

    return merge(tasks);
}

function purgeCss() {
    return src(paths.assets + 'css/boxstarter.bundle.css')
        .pipe(purgecss({
            content: [
                paths.input + '**/*.cshtml',
                paths.input + '**/*.md',
                paths.assets + 'js/*.*'
            ],
            safelist: [
                '::-webkit-scrollbar',
                '::-webkit-scrollbar-thumb',
                'link-light',
                'btn-github',
                'btn-website',
                'btn-facebook',
                'btn-twitter',
                'btn-linkedin'
            ],
            keyframes: true,
            variables: true
        }))
        .pipe(dest(paths.assets + 'css/'));
}

function minCss() {
    var tasks = getBundles(regex.css).map(function (bundle) {

        return gulp.src(bundle.outputFileName, { base: '.' })
            .pipe(cleancss({
                level: 2,
                compatibility: 'ie8'
            }))
            .pipe(rename({ suffix: '.min' }))
            .pipe(gulp.dest('.'));
    });

    return merge(tasks);
}

function minJs() {
    var tasks = getBundles(regex.js).map(function (bundle) {

        return gulp.src(bundle.outputFileName, { base: '.' })
            .pipe(uglify())
            .pipe(rename({ suffix: '.min' }))
            .pipe(dest('.'));
    });

    return merge(tasks);
}

function delEnd() {
    return src([
        paths.assets + 'css/*.css',
        '!' + paths.assets + 'css/*.min.css',
        paths.assets + 'js/*.js',
        '!' + paths.assets + 'js/*.min.js'
    ], { allowEmpty: true })
        .pipe(clean({ force: true }));
}

// Independent tasks
exports.del = del;

// Gulp series
exports.compileSassJs = parallel(compileSass, compileJs);
exports.minCssJs = parallel(minCss, minJs);

// Gulp default
exports.default = series(del, copyTheme, exports.compileSassJs, compileCss, purgeCss, exports.minCssJs, delEnd);

// Watch files
exports.watchFiles = function () {
    watch([paths.theme], exports.default);
};