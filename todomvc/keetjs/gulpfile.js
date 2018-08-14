const gulp = require('gulp')
const watch = require('gulp-watch')
const shell = require('gulp-shell')

gulp.task('bundle', function() {
  return watch(['src/**/*.js', 'keet/**/*.js'], {
      ignoreInitial: false
    })
    .pipe(shell('npm run build:rollup'))
})

gulp.task('default', ['bundle'])