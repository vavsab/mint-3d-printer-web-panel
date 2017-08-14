'use strict';
 
const gulp = require('gulp');
const less = require('gulp-less');
const gettext = require('gulp-angular-gettext');
const clean = require('gulp-clean');
const concat = require('gulp-concat');
const minify = require('gulp-minify');
const uglify = require('gulp-uglify');
const uglifyCss = require('gulp-uglifycss');
const merge = require('merge-stream');
const gulpSequence = require('gulp-sequence');
const spawn = require('child_process').spawn;
const htmlReplace = require('gulp-html-replace');

const argv = require('yargs').argv;
const isProduction = argv.dev === undefined;

gulp.task('default', ['less', 'i18n']);
gulp.task('i18n', ['i18n_generate', 'i18n_compile']);

gulp.task('less', () => 
  gulp.src(['./public/stylesheets/less/metro.less'])
    .pipe(less())
    .pipe(gulp.dest('./public/stylesheets/metro/'))
);

gulp.task('i18n_generate', () =>
  gulp.src(['public/**/*.html', 'public/**/*.js'])
    .pipe(gettext.extract('template.pot', {
      // options to pass to angular-gettext-tools... 
    }))
    .pipe(gulp.dest('i18n'))
);

gulp.task('i18n_compile', ['i18n_generate'], () =>
  gulp.src('i18n/**/*.po')
    .pipe(gettext.compile({
      // options to pass to angular-gettext-tools... 
      format: 'json'
    }))
    .pipe(gulp.dest('public/i18n/'))
);


gulp.task('clean', () => 
  gulp.src(['build/*', '!build/node_modules/'])
		.pipe(clean())
);

gulp.task('build', gulpSequence('copy_raw_to_build', 'copy_html_with_replace', 'build_js_custom', 'build_install_packages'));

gulp.task('copy_raw_to_build', () => {
  let tasks = [
    gulp.src(['public/**', '!public/javascripts/**'])
      .pipe(gulp.dest('build/public')),
    gulp.src(['public/javascripts/lib-scripts.js'])
      .pipe(gulp.dest('build/public/javascripts')),
    gulp.src(['public/javascripts/theme-scripts/**'])
      .pipe(gulp.dest('build/public/javascripts/theme-scripts')),
    gulp.src(['service/**'])
      .pipe(gulp.dest('build/service')),
    gulp.src(['pm2.json', 'package.json'])
      .pipe(gulp.dest('build')),
    gulp.src(['configFiles/*SettingsDefault*'])
      .pipe(gulp.dest('build/configFiles')),
    gulp.src(['config/**'])
      .pipe(gulp.dest('build/config')),
    gulp.src(['desktop-loader/bin/desktop-loader-linux-armv7l/**'])
      .pipe(gulp.dest('build/desktop-loader'))
  ];

  if (!isProduction) {
    tasks.push(gulp.src(['emulators/**'])
      .pipe(gulp.dest('build/emulators')));
  }

  return merge(tasks);
});

gulp.task('copy_html_with_replace', () =>
  gulp.src('public/index.html')
    .pipe(htmlReplace({
        'js': '/javascripts/custom-scripts.js'
    }))
    .pipe(gulp.dest('build/public'))
);

gulp.task('build_install_packages', (done) => {
  let npmCommand = 'npm';
  if (/^win/.test(process.platform)) {
    npmCommand = 'npm.cmd';
  }

  new Promise((resolve, reject) => {
    spawn(npmCommand, ['install', '--production'], { cwd: `${__dirname}/build` })
      .on('close', resolve)
      .on('error', reject);
  })
  .then(new Promise((resolve, reject) => {
    spawn(npmCommand, ['prune', '--production'], { cwd: `${__dirname}/build` })
      .on('close', resolve)
      .on('error', reject)
  }))
  .then(done)
  .catch(reason => console.error(reason));
});

gulp.task('build_js_custom', () => 
  gulp.src(['public/javascripts/**/*.js', '!public/javascripts/lib-scripts.js', '!public/javascripts/libs/**', '!public/javascripts/theme-scripts/**'])
    .pipe(concat('custom-scripts.js'))
    .pipe(gulp.dest('build/public/javascripts'))
);

gulp.task('build_css_libs', () => {
    const pathPrefix = 'public/';

    const libs = [
      'stylesheets/metro/metro.css',
      'javascripts/libs/metisMenu/dist/metisMenu.min.css',
      'javascripts/libs/font-awesome/css/font-awesome.min.css',
      'javascripts/libs/keyboard/dist/css/keyboard-dark.min.css'
    ];

    for (let i = 0; i < libs.length; i++) {
      libs[i] = pathPrefix + libs[i];
    }

    return gulp.src(libs)
      .pipe(concat('lib-styles.css'))
      .pipe(uglifyCss())
      .pipe(gulp.dest('public/stylesheets'));
});

gulp.task('build_js_libs', () => {
    const pathPrefix = 'public/javascripts/libs/';

    const libs = [
      'jquery/dist/jquery.min.js',
      'rxjs/dist/rx.all.js',
      'bootstrap/dist/js/bootstrap.min.js',
      'angular/angular.js',
      'angular-route/angular-route.js',
      'angular-cookies/angular-cookies.js',
      'angular-resource/angular-resource.js',
      'angular-animate/angular-animate.js',
      'angular-touch/angular-touch.js',
      'angular-bootstrap/ui-bootstrap-tpls.js',
      'angular-gettext/dist/angular-gettext.js',
      'ng-file-upload/ng-file-upload.js',
      'jquery-ui/jquery-ui.js',
      'keyboard/dist/js/jquery.keyboard.js',
      'ng-virtual-keyboard/dist/ng-virtual-keyboard.js',
      'chart.js/dist/Chart.js',
      'angular-chart.js/dist/angular-chart.js',
      'angular-local-storage/dist/angular-local-storage.js',
      'angular-route-segment/build/angular-route-segment.js',
      'metisMenu/dist/metisMenu.min.js',
      'raphael/raphael.min.js',
      'metro/build/js/metro.js'
    ];

    for (let i = 0; i < libs.length; i++) {
      libs[i] = pathPrefix + libs[i];
    }

    return gulp.src(libs)
      .pipe(concat('lib-scripts.js'))
      .pipe(uglify())
      .pipe(gulp.dest('public/javascripts'));
  }
);