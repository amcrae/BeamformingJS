Beamforming in HTML5+AngularJS
====================================

This project is a mini toy application to simulate beamforming antenna arrays and
 let the user experiment with different array shapes to see what sort of radiation
 pattern results.

This branch of the project is my first attempt to port a simple client-side only application into the AngularJS 1.6 framework. 

Demo
-----
Demo of the AngularJS version is not yet deployed, it's a work-in-progress.


License
-------
Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License 
as shown in the main html file.


Build Environment
-----------------
The only action the build does at this point is download the vendor libraries.
It could optionally bundle/inline the javascript file into the HTML file, but that is not really necessary as the application will run from src/ just fine.

1. Install npm for your system.  
`  sudo apt-get install npm`
1. Install gulp with command line front end, globally.  
`  sudo npm install --global gulp-cli`
1. Make a local project directory.  
`  mkdir BeamformingJS ; cd BeamformingJS`
1. Clone the git repository to the local project directory.  
`  git clone 'git@github.com:amcrae/BeamformingJS.git' `
1. Fetch and install the required npm packages into the project directory:  
`  npm install`
1. Build the all-in-one HTML file into the dist/ folder.  
`  gulp`


Approximate History
--------------------

?? Dec 2014 : Became interested in how radar/ultrasonic beamforming is done.

18 Jan 2015 : First version 1.0 written and released to a handful of people via Dropbox.

03 Aug 2016 : Version 1.1 moved the array closer to centre of rendered area.

15 Aug 2016 : Version 1.1 put under revision control and released on GitHub.

The rest, as they say, is git log history.
