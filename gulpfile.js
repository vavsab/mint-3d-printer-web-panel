'use strict';
 
var gulp = require('gulp');
var less = require('gulp-less');

gulp.task('default', ['less']);

gulp.task('less', function () {
  return gulp.src(['./public/stylesheets/less/tiles.less', 
    './public/javascripts/libs/metro/less/colors.less'])
    .pipe(less())
    .pipe(gulp.dest('./public/stylesheets/metro/'));
});