const gulp = require('gulp')
const watch = require('gulp-watch')
const shell = require('gulp-shell')

gulp.task('bundle', function() {
  return watch(['src/**/*.js', 'keet/**/*.js'], { ignoreInitial: false }).pipe(
  	shell('rollup -c rollup.config.js')
  )
})

gulp.task('default', ['bundle'])