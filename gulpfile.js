'use strict';
 
const gulp = require('gulp');
const less = require('gulp-less');
const gettext = require('gulp-angular-gettext');

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