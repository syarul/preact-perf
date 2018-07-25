const gulp = require('gulp')
const watch = require('gulp-watch')
const shell = require('gulp-shell')

gulp.task('bundle', function() {
  return watch(['src/**/*.js', 'keet/**/*.js'], {
      ignoreInitial: false
    })
    // .pipe(shell('browserify src/app.js | uglifyjs --compress --mangle > build.js'))
    .pipe(shell('browserify src/app.js --debug -o build.js'))
})

gulp.task('default', ['bundle'])