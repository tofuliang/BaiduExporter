const gulp = require('gulp')

const rollupEach = require('gulp-rollup-each')
const rollupCommon = require('@rollup/plugin-commonjs')
const rollupResolve = require('@rollup/plugin-node-resolve')
const rollupBuble = require('@rollup/plugin-buble')

const del = require('del')
const gulpIf = require('gulp-if')

const eslint = require('gulp-eslint')
const stylelint = require('gulp-stylelint')

const postcss = require('gulp-postcss')
const sass = require('gulp-sass')
const autoprefixer = require('autoprefixer')
const concat = require('gulp-concat')
const cleanCSS = require('gulp-clean-css')

const imagemin = require('gulp-imagemin')
const mozjpeg = require('imagemin-mozjpeg')
const pngquant = require('imagemin-pngquant')

const plumber = require('gulp-plumber')

const terser = require('gulp-terser')

const sourcemaps = require('gulp-sourcemaps')

const fs = require('fs')
const replace = require('gulp-replace');

const paths = {
  scripts: {
    src: 'src/js/**/*.js',
    entry: 'src/js/*.js',
    dest: 'release/js/'
  },
  styles: {
    src: 'src/css/**/*.scss',
    dest: 'release/css/'
  },
  images: {
    src: 'src/img/**/*',
    dest: 'release/img/'
  },
  copys: {
    src: ['_locales/**/*', 'background.js', 'manifest.json'],
    dest: 'release/'
  }
}

const config = {
  plumberConfig: {
    errorHandler: function (err) {
      console.log(err.toString())
      this.emit('end')
    }
  },
  env: {
    dev: process.env.NODE_ENV === 'development',
    prod: process.env.NODE_ENV === 'production'
  }
}

function lintJS () {
  return gulp.src(paths.scripts.src)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
}

function lintCSS () {
  return gulp.src(paths.styles.src)
    .pipe(stylelint({
      reporters: [
        { formatter: 'string', console: true }
      ]
    }))
}

function scripts () {
  return gulp.src(paths.scripts.entry)
    .pipe(plumber(config.plumberConfig))
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(gulpIf(config.env.dev, sourcemaps.init()))
    .pipe(rollupEach({
      isCache: true,
      plugins: [
        rollupCommon(),
        rollupResolve({
          browser: true
        }),
        rollupBuble({
          transforms: { forOf: false, asyncAwait: false }
        })
      ] },
    {
      format: 'iife'
    }
    ))
    .pipe(gulpIf(config.env.prod, terser()))
    .pipe(gulpIf(config.env.dev, sourcemaps.write()))
    .pipe(gulp.dest(paths.scripts.dest))
}

function styles () {
  return gulp.src(paths.styles.src)
    .pipe(plumber(config.plumberConfig))
    .pipe(stylelint({
      reporters: [
        { formatter: 'string', console: true }
      ]
    }))
    .pipe(sass({
      outputStyle: 'nested',
      precision: 3,
      includePaths: ['.']
    }))
    .pipe(postcss([
      autoprefixer()
    ]))
    .pipe(concat('style.css'))
    .pipe(gulpIf(config.env.prod, cleanCSS()))
    .pipe(gulp.dest(paths.styles.dest), { sourcemaps: config.env.dev })
}

function images () {
  return gulp.src(paths.images.src)
    .pipe(plumber(config.plumberConfig))
    .pipe(imagemin([
      pngquant(),
      mozjpeg(),
      imagemin.svgo()], {
      verbose: true
    }))
    .pipe(gulp.dest(paths.images.dest))
}

function copys () {
  return gulp.src(paths.copys.src, { base: '.' })
    .pipe(gulp.dest(paths.copys.dest))
}

function clean () {
  return del(['release'])
}

function watch () {
  gulp.watch(paths.copys.src, copys)
  gulp.watch(paths.scripts.src, scripts)
  gulp.watch(paths.styles.src, styles)
}

function bumpVersion() {
  var docString = fs.readFileSync('manifest.json', 'utf8');

  var versionNumPattern=/"(\d\.\d\.\d\.\d)"/;
  var vNumRexEx = new RegExp(versionNumPattern);

  var oldVersionNumber = (vNumRexEx.exec(docString))[1];
  var versionParts = oldVersionNumber.split('.');
  var vArray = {
    vMajor : versionParts[0],
    vMinor : versionParts[1],
    vPatch : versionParts[2],
    vMod : versionParts[3]
  };

  vArray.vMod = parseFloat(vArray.vMod) + 1;
  var periodString = ".";

  var newVersionNumber = vArray.vMajor + periodString +
      vArray.vMinor+ periodString +
      vArray.vPatch+ periodString +
      vArray.vMod;

  return gulp.src(['manifest.json','src/js/lib/ui.js','updates.xml'])
      .pipe(replace(/'\d\.\d\.\d(\.\d)?'/g, "'"+newVersionNumber+"'"))
      .pipe(replace(/"\d\.\d\.\d(\.\d)?"/g, '"'+newVersionNumber+'"'))
      .pipe(gulp.dest(function(file) {
        return file.base;
      }))
      ;
}

const build = gulp.parallel(scripts, styles, images, copys)
const serve = gulp.series(clean, build, watch)
const publish = gulp.series(clean, build)

exports.build = build
exports.serve = serve
exports.publish = publish
exports.lintJS = lintJS
exports.lintCSS = lintCSS
exports.clean = clean
exports.bumpVersion = bumpVersion
