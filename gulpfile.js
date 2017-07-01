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
  gulp.src('build', {read: false})
		.pipe(clean())
);

gulp.task('build', gulpSequence(['copy_raw_to_build', 'build_js_custom']));

gulp.task('copy_raw_to_build', () => 
  merge(
    gulp.src(['public/**', '!public/javascripts/**'])
      .pipe(gulp.dest('build/public')),
    gulp.src(['service/**'])
      .pipe(gulp.dest('build/service')),
    gulp.src(['desktop-loader/**'])
      .pipe(gulp.dest('build/desktop-loader')),
    gulp.src(['*SettingsDefault*', 'pm2.json'])
      .pipe(gulp.dest('build'))
  )
);

gulp.task('build_js_custom', () => 
  gulp.src(['public/javascripts/**/*.js', '!public/javascripts/libs/**'])
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