var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var runSequence = require('run-sequence');
var browserSync = require('browser-sync').create();
var reload = browserSync.reload;
var path = require('path');
var streamqueue = require('streamqueue');
var eslint = require('gulp-eslint');
var postcss = require('gulp-postcss');
var postcssOpacity = require('postcss-opacity');
var postcssFilterGradient = require('postcss-filter-gradient');
var autoprefixer = require('autoprefixer');
var htmlmin = require('gulp-htmlmin');

// Product Component JavaScript
var productJS = require('./libs/files/product-detail').JS;

// Package data
var pkg = require('./package.json');

var distPath = './dist';

var banner = {
    full: [
        '/*!',
        ' * Chico UI v' + pkg.version,
        ' * http://chico-ui.com.ar/',
        ' *',
        ' * Copyright (c) ' + (new Date().getFullYear()) + ', MercadoLibre.com',
        ' * Released under the MIT license.',
        ' * http://chico-ui.com.ar/license',
        ' */\n'
    ].join('\n'),
        'min': '/*! Chico UI v' + pkg.version + ' chico-ui.com.ar | chico-ui.com.ar/license */\n'
};

// Copy Chico related assets
gulp.task('copy', function () {
    // Everything in the assets folder
    return gulp
        .src(['./src/shared/assets/**/*.*'], {
            base: './src/shared/'
        })
        .pipe(gulp.dest(distPath));
});

// Minify HTML
gulp.task('htmlMinify', function() {
  return gulp.src('views/product-detail.html')
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe($.rename({suffix: '.min'}))
    .pipe(gulp.dest('views'))
});

// Compile Sass
gulp.task('sass', [
    'sass:product-detail'
]);

gulp.task('sass:product-detail', function () {
    return gulp.src('src/product-detail/styles/product-detail-theme.scss')
        .pipe($.sourcemaps.init())
        .pipe($.sass({
            outputStyle: 'expanded' // nested, compact, compressed, expanded
        }))
        .pipe(postcss([
            autoprefixer({'browsers': ['last 5 versions', 'android >= 2.1', '> 1%']})
        ]))
        .pipe($.rename('base.css'))
        .pipe($.wrapper({
            header: banner.full
        }))
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest(path.join(distPath, 'product-detail')))
        .pipe(browserSync.stream());
});

// Minify the compiled CSS
gulp.task('minifyCSS', function() {
    return gulp.src(['dist/**/*.css', '!dist/**/*.min.css'])
        .pipe($.cssnano())
        .pipe($.rename({suffix: '.min'}))
        .pipe(gulp.dest(distPath));
});

// Concatenate and copy Chico JS
gulp.task('concatJS', [
    'concatJS:product-detail'
]);

gulp.task('concatJS:product-detail', function() {
    return streamqueue({ objectMode: true },
        gulp.src(productJS.core).pipe($.concat('core.js')).pipe($.wrapper({
            header: "\n(function (window) {\n\t'use strict';\n\n",
            footer: '\n\tch.version = \'' + pkg.version + '\';\n\twindow.ch = ch;\n}(this));'
        })),
        gulp.src(productJS.abilities.concat(productJS.components))
    )
        .pipe($.concat('base.js'))
        .pipe($.wrapper({
            header: banner.full
        }))
        .pipe(gulp.dest(path.join(distPath, 'product-detail')));
});

// Minify the JS
gulp.task('minifyJS', [
    'minifyJS:product-detail'
]);

// Product Component JavaScript
gulp.task('minifyJS:product-detail', function () {
    return gulp.src(path.join(distPath, 'product-detail/base.js'))
        .pipe($.uglify({
            beautify: true,
            mangle: false
        }).on('error', function(e) {
            console.log(e);
        }))
        .pipe($.wrapper({
            header: banner.min
        }))
        .pipe($.rename({suffix: '.min'}))
        .pipe(gulp.dest(path.join(distPath, 'product-detail')));
});

// Start a BrowserSync server, which you can view at http://localhost:3040
gulp.task('browser-sync', ['build'], function () {
    browserSync.init({
        port: 3040,
        startPath: '/product-detail.html',
        server: {
            baseDir: [
                // base path for views and demo assets
                'views/',
                // root folder for everything else
                './'
            ],
            middleware: [
                function(req, res, next) {
                    var redirectTo;

                    switch (req.url) {
                        case '/':
                        case '/product':
                        case '/product-detail':
                            redirectTo = '/product-detail.html';
                            break;
                    }

                    if (redirectTo) {
                        res.writeHead(301, {Location: redirectTo});
                        res.end();
                    } else {
                        next();
                    }
                }
            ]
        },
        bsFiles: {
            src: [
                'dist/**/*.css',
                'dist/**/*.js',
                'views/*.html'
            ]
        }
    });

    gulp.watch(['src/shared/**/*.js', 'src/product-detail/**/*.js'], ['concatJS:product-detail']);
    gulp.watch('dist/**/*.js').on('change', reload);
    gulp.watch('src/views/*.html').on('change', reload);
    gulp.watch('src/**/styles/**/*.scss', ['sass']);
});

// Validates JavaScript files with ESLint
gulp.task('lint', function () {
    return gulp.src(['src/**/*.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failOnError());
});

// Build all files without starting a server
gulp.task('build', function (done) {
    runSequence([
        'copy',
        'htmlMinify',
        'sass',
        'concatJS'
    ], done);
});

// Build and minify all files without starting a server
gulp.task('dist', function (done) {
    runSequence('build', [
        'minifyCSS',
        'minifyJS'
    ], done);
});

// Dev task: build the Chico and start a server
gulp.task('dev', [
    'build',
    'browser-sync'
]);

// Default task: run the dev
gulp.task('default', ['dev']);