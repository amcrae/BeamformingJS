// Build environment pre-requisites:
//   sudo npm install --global gulp-cli
// 	 npm install del gulp-inline

var gulp = require('gulp');
var del = require('del');
var inline = require('gulp-inline');
//  , uglify = require('gulp-uglify')
//  , minifyCss = require('gulp-minify-css');
var mergeStream = require('merge-stream');

var paths = {
  scripts: ['src/js/*.js'],
  extlibs: [ "node_modules/angular/angular.min.js","node_modules/angular/angular.min.js.map",
	  		 "node_modules/angular/angular.js"
	  		],
  pages: ["src/*.html"],
  images: 'resources/*',
  build: 'dist'
};

gulp.task('clean', function() {
  // You can use multiple globbing patterns as you would with `gulp.src` 
  return del([paths.build]);
});


gulp.task("extlibs", ['clean'], function() { 
	var extlibs = gulp.src(paths.extlibs)
		.pipe(gulp.dest('dist/js'));
	return extlibs;
 }
);

gulp.task('scripts', ['clean','extlibs'], function() {
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
	var html = gulp.src(paths.pages)
	  	.pipe(gulp.dest('dist/'));
	var scripts = gulp.src(paths.scripts)
  		.pipe(gulp.dest('dist/js'));
	return mergeStream(html, scripts);
});

gulp.task('default', ['scripts']);