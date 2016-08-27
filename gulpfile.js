// Build environment pre-requisites:
//   sudo npm install --global gulp-cli
// 	 npm install del gulp-inline

var gulp = require('gulp');
var del = require('del');
var inline = require('gulp-inline');
//  , uglify = require('gulp-uglify')
//  , minifyCss = require('gulp-minify-css');

var paths = {
  scripts: ['src/*.js'],
  images: 'resources/*',
  build: 'dist'
};

gulp.task('clean', function() {
  // You can use multiple globbing patterns as you would with `gulp.src` 
  return del([paths.build]);
});

gulp.task('scripts', ['clean'], function() {
  // Minify and copy all JavaScript (except vendor scripts) 
  // with sourcemaps all the way down
  /*
  return gulp.src(paths.scripts)
    .pipe(sourcemaps.init())
      .pipe(coffee())
      .pipe(uglify())
      .pipe(concat('all.min.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('build/js'));
  */
	return gulp.src('src/beamforming.html')
	  .pipe(inline({
	    base: 'src/',
	    //js: uglify,
	    //css: minifyCss,
	    disabledTypes: ['svg', 'img'], 
	    ignore: ['./css/do-not-inline-me.css']
	  }))
	  .pipe(gulp.dest('dist/'));
});

gulp.task('default', ['scripts']);