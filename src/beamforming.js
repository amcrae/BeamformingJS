/**
 <span xmlns:dct="http://purl.org/dc/terms/" href="http://purl.org/dc/dcmitype/InteractiveResource" property="dct:title" rel="dct:type">
 	Beamforming Simulation in HTML5+Javascript
 </span>
 	by 
 <span xmlns:cc="http://creativecommons.org/ns#" property="cc:attributionName">
 	Andrew McRae
 </span> 
 	is licensed under a 
 <a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">
 	Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License
 </a>.
 Permissions beyond the scope of this license may be available at 
  <a xmlns:cc="http://creativecommons.org/ns#" href="mailto:ajmcrae_(at)_gmail_dot_com" rel="cc:morePermissions">
 	ajmcrae (at) gmail dot com
  </a>.
**/


/**
 * Multidimensional real-valued Vector class implemented as a library of static 
 * methods accepting standard ECMAscript Number arrays so that the JS engine
 * may be able to optimise some operations better.
 * The result of any operation will usually be a high precision type because of the involvement of Math.PI and Math.cos etc.
 *    
 * @static */
var VecUtil = {
	__prefixesMacro:['k','M','G','T','P'],
	__prefixesMicro:['m','μ','n','p','f'],

	degToRad: function(deg){  return Math.PI*deg/180.0 },
	radToDeg: function(rad){  return 180.0*rad/Math.PI },

	add: function(a,b){ 
		var answer=[];
		for (var k in a) {
			answer.push(a[k]+b[k]);
		}
		return answer;
	},
	
	sub: function(a,b){ 
		var answer=[];
		for (var k in a) {
			answer.push(a[k]-b[k]);
		}
		return answer;
	},

	mag: function(v){ 
		var answer=0;
		for (var k in v) {
			answer += ( v[k] * v[k] );
		}
		return Math.sqrt(answer);
	},

	dot: function(a,b){
		var answer=0;
		for (var k in a) {
			answer += (a[k]*b[k]);
		}
		return answer;
	},

	polarToVec2D: function(angle, radius){
		return [radius*Math.cos(angle), radius*Math.sin(angle) ];
	},

	angleBetween: function(a,b) {
		var cosTheta = this.dot(a,b) / (this.mag(a)*this.mag(b));
		return Math.acos( cosTheta );
	},

	toPolar: function(v) {
		var m = this.mag(v);
		var ang = this.angleBetween([1,0], v);
		if (v[1]<0) ang *= -1;
		return {radius: m, angle:ang};
	},

	/** Handy routine to write a quantity as a string with appropriate SI scaling prefixes 
	 * prepended to the basic SI unit of measurement, which can be easier to 
	 * understand for most people than scientific notation. */
	toEngFormat: function(val, baseSIUnit) {
		if (val==0) return "0"+baseSIUnit;
		var absval = Math.abs(val);
		var order = Math.floor(Math.log10(absval));
		var shifter = Math.floor(order / 3);
		var shifted = absval * Math.pow(10, -shifter*3);
		if (shifter>5 || shifter<-5) {
		  return val.toPrecision(3)+baseSIUnit;
		} else {
		  var formatted = Math.sign(val) * shifted.toPrecision(3)
		  + (shifter==0 ? baseSIUnit
				 : ( shifter<0 ? this.__prefixesMicro[-shifter-1] + baseSIUnit
				  	       : this.__prefixesMacro[ shifter-1] + baseSIUnit )
		  );
		  return formatted;
		}
	}
}


/** Specify an axis-aligned box from number arrays compatible with VecUtils.
 * @constructor
 * @param {Number[]} minPos The corner of the box with the least coordinates. 
 * @param {Number[]} size 	The box dimensions.
 * */
var Box2D = function(minPos, size) {
  return {
     minCorner: minPos
    ,size: size
    ,maxCorner:   function() { return VecUtil.add(this.minCorner, this.size) }
    ,topLeft:     function() { return [ this.minCorner[0], this.minCorner[1]+this.size[1] ] }
    ,bottomRight: function() { return [ this.minCorner[0]+this.size[0], this.minCorner[1] ] }
    ,toString:	  function() { return "Box2D{minCorner:("+this.minCorner+"),size:("+ this.size+") }"; }
    ,contains:	  function(point) { 
    	return this.minCorner[0]<=point[0]
    		&& this.minCorner[1]<=point[1]	
    		&& this.maxCorner()[0]>=point[0]
    		&& this.maxCorner()[1]>=point[1];
    }
  };
}


/**
 * Template for an Emitter, although these are always created by the client. 
 * @class
 * @param props		An object to override the default properties of the created Emitter. */
var Emitter = function(props) {
	return {
		id: 		props.id 			|| 'E0', 
		signalID: 	props.signalID 		|| 'S0', 
		emitterType:props.emitterType 	|| 'Omni', 	  //Omni is the only one supported.
		delay:		props.delay 		|| 0, 
		amplitude:	props.amplitude		|| 30, 
		position:	props.position 		|| [ 0.0, 0.0], 
		direction:	props.direction		|| [0,1], 	  //Not supported in sim yet.
		halfAngleRad:props.halfAngleRad	|| Math.PI,   //Not supported in sim yet.
		phaseCache: null	// Not used yet, but may memoize phase offset of propagated wave in future.
	};
}


/** Beamforming functionality assuming a rendering function will be provided later on demand by the client.
 * 
 *  @param {Object} conf 	The wave transport scenario contains properties for a medium, simArea, signals, emitters, reflectors,
 *  as shown in the default value of the config property below.    
 * */
var BeamForming = function(conf) {
 var _bf = this;
 var bf = {
    config:{
            medium:{propagationSpeed:343},
            simArea:new Box2D([-10,-10], [20,20]),
            signals:{id:'S0',  signalType:"Sine", frequency:440},
            emitters:[
                {id:'E0', emitterType:'Omni', signalID:'S0', position:[ 0, 0],  },
            ],
            reflectors:[
                {id:"T0", position:[0,6], geomType:"Circle", radius:0.1}
            ]
    },

    state:{
    	simTime:0
    },


    __signalCache: {},

    getSignalById : function(id) {
		var cv = this.__signalCache[id];
		if (cv && cv.id == id)
			return cv;
		for ( var i in this.config.signals) {
			var e = this.config.signals[i];
			if (e.id == id) {
				this.__signalCache[id] = e;
				return e;
			}
		}
		throw ("No Such Signal! " + id.toString());
	},

	getEmitterById : function(id) {
		for ( var i in this.config.emitters) {
			var e = this.config.emitters[i];
			if (e.id == id)
				return e;
		}
		throw ("No Such Emitter! " + id.toString());
	},

	getSignalValue : function(sig, toff) {
		if (sig.signalType == "Sine") {
			if (sig.duration && (toff < 0 || toff > sig.duration))
				return 0;
			return Math.sin(2 * Math.PI * sig.frequency * toff);
		}
		throw "Unknown signalType";
	},

	/**
	 * Gets the displacement of the signal wave at a position in space and time 
	 * after it has been transmitted by the emitter. 
	 * @param em {Emitter}		The emitter which is already configured with a signalID. 
	 * @param pos {Number[]}	The position in simulation space. 
	 * @param tSim {Number}		The absolute time in the simulation model. */
	getDisplacementAtPoint : function(em, pos, tSim) {
		var sig = this.getSignalById(em.signalID);
		var relPos = VecUtil.sub(pos, em.position);
		var propDist = VecUtil.mag(relPos);
		var propTime = propDist / this.config.medium.propagationSpeed;
		var cycle = this.getSignalValue(sig, (tSim - propTime - em.delay));
		return em.amplitude * cycle / propDist;
	},

	/** Supports a single client modelChanged event handler, so demux to multiple listeners
	 * would have to be handled by the provided function. */
	modelChanged : null, // GUI event handler to show model after it has changed.

	/**
	 * Does the actual Beamforming formula, which for a fixed frequency continuous wave carrier
	 * requires only setting the relative timing offsets for transmission at each antenna relative
	 * to the "lead element". The lead element has a beamforming phase offset of zero by definition.
	 * Although in theory the lead element can be any antenna for a static sine ping signal, 
	 * in practice you cannot have negative delays to a live/dynamic signal so the lead element
	 * will always transmit first, therefore it should be the antenna furthest from the target 
	 * so that the signal is emitted from the nearest element when the transmission from the 
	 * lead element first reaches the nearest element to give a reinforcing superposition.
	 * */
	formBeamDelays : function(referenceEmitterId, beamAngleRad) {
		var answer = [];
		var d = 0;
		var refEm = this.getEmitterById(referenceEmitterId);
		for ( var id in this.config.emitters) {
			var e = this.config.emitters[id];
			if (e.id == refEm.id) {
				d = 0;
			} else {
				// var sig = this.getSignalById(e.signalID);
				// var lambda =
				// this.config.medium.propagationSpeed/sig.frequency;
				var baseline = VecUtil.sub(e.position, refEm.position);
				var basePol = VecUtil.toPolar(baseline);
				// now for the tricky part.
				var rotate = beamAngleRad - (basePol.angle);
				var doff = basePol.radius * Math.cos(rotate);
				d = doff / this.config.medium.propagationSpeed;
			}
			answer.push({
				id : e.id,
				delay : d
			});
		}
		return answer;
	},

	setEmitterDelays : function(poffs) {
		var changeset = [];
		for ( var i in poffs) {
			var ed = poffs[i];
			var e = this.getEmitterById(ed.id);
			e.delay = ed.delay;
			changeset.push(e);
		}
		if (this.modelChanged)
			this.modelChanged({emitters:changeset});
	},

	resetState : function() {
		this.state = { };
		this.state.simTime = 0.0;
		this.state.simProgress = 0.0;
	},

	/** Queue of regions to be simulated using current Beamforming object parameters. */
	simTaskQueue: [ ],
	
	doNextTask: function() {
		if (this.simTaskQueue.length>0) {
			var task = this.simTaskQueue.shift();
			this.simulateUntilSteady(task.simArea);
			this.state.simProgress = Math.min(100, task.beamFormer.state.simProgress + task.progressIncrement);
			task.callback(task.simArea, (this.simTaskQueue.length>0));
			setTimeout(this._handleNextSimTask, 6);
		}		
	},

	
	/**
	 * Signature of "completionCallback" visitor must be: 
	 *   function(region, isFinished)
	 * The region is the region whose simulation has been completed,
	 * The isFinished==true when no more tasks remain to do,
	 * */
	startSimulationAsynch: function(nSubRegions, completionCallback) {
		var _t = this;
		this.simTaskQueue = [ ];
		for (var _si = 0; _si < nSubRegions; _si++) {
			var reg = new Box2D(
				[	this.config.simArea.minCorner[0],
					this.config.simArea.minCorner[1] +
						_si * this.config.simArea.size[1] / nSubRegions 
				],
				[ this.config.simArea.size[0],
				  this.config.simArea.size[1] / nSubRegions
				]
			);
			this.simTaskQueue.push( 
				{ 	msgType : "simulate",
					beamFormer : _t,
					simArea : reg ,
					callback: completionCallback,
					progressIncrement : 100 / nSubRegions
				} 
			);
		}
		//probably should be handled by client, as I'm making assumptions about browser environment.
		setTimeout(this._handleNextSimTask, 5);
	},

	
	/** Run simulation for region. */
	simulateUntilSteady : function(region) {
		//TODO: move simulation code here!
		
		if (this.modelChanged) this.modelChanged( {region:region, emitters:true} );
	},
	
	
	// ----------- View support functions for rendering. ----------------

	/**
	 * Transform a position in simulation model space to a image position in the View.
	 * @param position:		VecUtil array 
	 * @param simDims:		Box2D in world space. 
	 * @param imageDims:	array in pixel units.
	 */
	modelToImage : function(position, simDims, imageDims) {
		var x = Math.round(imageDims[0]
				* (position[0] - simDims.topLeft()[0]) / simDims.size[0]);
		var y = Math.round(imageDims[1]
				* (simDims.topLeft()[1] - position[1]) / simDims.size[1]);
		return [ x, y ];
	},
	
	
	/** These are the different supported ways of representing the state of the 
	 * wave propagation at a fixed instant of time. */
	WAVE_DRAW_STYLES: [
	           		"Cohere", 	// Coherence over small changes in time or wave phase offset.
	           		"Disp",	  	// Vertical displacement.
	           		"Cohere+Disp" //Both of the above in different colour channels.
	           	],

	
	_x_unused_renderState : function(canvas, rstyle, webworkers) {
		// alert("render at this point");
		var context = canvas.getContext('2d');
		context.setTransform(1, 0, 0, 1, 0, 0);

		var _t = this; // the old one-two-capture trick.
		
		var nSubRegions = 8;
		var simCompletion = function(region, isFinished, nextTask) {
			
		};
		startSimulationAsynch(nsubRegions, completionCallback);
		
		var multiThreaded = (webworkers != null)
				&& (typeof (Worker) !== "undefined")
				&& webworkers.length >= 2;

		if (multiThreaded) {
			var nThreads = webworkers.length;
			var simRegions = [];
			// var workers=[];
			for (var _zi = 0; _zi < nThreads; _zi++) {
				var reg = new Box2D([
						this.config.simArea.minCorner[0],
						this.config.simArea.minCorner[1] + _zi
								* this.config.simArea.size[1] / nThreads ],
						[ this.config.simArea.size[0],
								this.config.simArea.size[1] / nThreads ]);
				/*
				 * // old serial code simRegions.push(reg); var r0 =
				 * function wrk (){ console.log("Started "+wrk.wid+ " for
				 * "+wrk.sr); _t._renderRegion(wrk.sr,context,rstyle);
				 * console.log("Finished "+wrk.wid); wrk.finshed = true; };
				 * r0.sr = reg; r0.finished=false; r0.wid = _zi;
				 * workers.push(r0); window.setTimeout( r0 ) ;
				 */
				webworkers[_zi].postMessage({
					msgType : "render",
					beamFormer : _t,
					simArea : reg,
					rstyle : rstyle
				}); // context2d:context,
			}
			// DIY Thread.join()
			/*
			 * do { var allfinished=true; for(_wx in workers) { allfinished =
			 * allfinished && workers[_wx].finished; } } while
			 * (!allfinished)
			 */

		} else {
			// No parallel rendering.
			/*
			// Render entire region in one task.
			this._renderRegion(this.config.simArea, context, rstyle);
			*/
			while (simTaskQueue.length>0) {
				var task = simTaskQueue.shift();
				this._SimAndRenderRegion(task.region, context, rstyle);
			}
			
		}
	},
	
	
	/** Sima plus rendering into the given drawing context of
	 * the wave state in the given simulation space region at the current model time.
	 * 
	 * @param simArea 	A Box2D defining the region whose wave state is to be rendered.
	 * @param context	A 2D drawing context as defined by HTML5 Canvas element.
	 * @param rstyle	One of the constnt values in WAVE_DRAW_STYLES.	
	 * */
	_SimAndRenderRegion : function(simArea, context, rstyle) {
		// Do coherence calcs??
		var calcCohere = (rstyle.indexOf("Cohere") >= 0);

		// Because the current simple implementation is synchronous and does not
		// store the wave state, the render function actually implements the 
		// wave simulation too. This is not a clean separation of view and model,
		// but this can be fixed in future versions.
		
		var maxEmit = 0;
		for ( var ei in this.config.emitters) {
			var em = this.config.emitters[ei];
			maxEmit += em.amplitude;
		}

		var canvasDims = [ context.canvas.width, context.canvas.height ];

		var canvasRegion = {};
		canvasRegion.topLeft 	 = this.modelToImage(simArea.topLeft(), 	this.config.simArea, canvasDims);
		canvasRegion.bottomRight = this.modelToImage(simArea.bottomRight(), this.config.simArea, canvasDims);
		canvasRegion.size = VecUtil.sub(canvasRegion.bottomRight, canvasRegion.topLeft);
		canvasRegion.size[1] = Math.abs(canvasRegion.size[1]);

		// get the image data to manipulate
		var ibuff = context.getImageData(
				canvasRegion.topLeft[0], canvasRegion.topLeft[1], 
				canvasRegion.size[0], canvasRegion.size[1]
		);

		var w = ibuff.width, h = ibuff.height;

		var simW = simArea.size[0]; // simArea.right-simArea.left;
		var simH = simArea.size[1]; // simArea.top-simArea.bottom;
		var maxPower = 0
		var pseries = [];

		// set colour of every pixel to the total sound pressure level
		for (var y = 0; y < h; y += 1) {
			for (var x = 0; x < w; x += 1) {
				var D = 0, pAvg = 0;
				pseries.length = 0; // clear

				/* Too slow, disabled.
				 * 
				 * //Supersample pixels since lambda is much smaller than a pixel for Ultrasonics. 
				 * for (var dy=-0.2;dy<=0.2;dy+=0.1) {
				 *  for (var dx=-0.2;dx<=0.2;dx+=0.1) {
				 */
				var dx = 0, dy = 0;

				// simple orthographic view inverse transform
				var pos = [ 
				            simArea.minCorner[0] + (x + dx) * (simW) / w,
				            simArea.topLeft()[1] - (y + dy) * (simH) / h 
				];

				/* Disabled supersampling.
				 * //get temporal correlation at a single spatial point 
				 * for (var dp=-0.5;dp<=0.5;dp+=0.1) {
				 */
				var dp = 0;

				var P = 0; // Sound Pressure Level
				// add contributions from each emitter to this point.
				for ( var ei in this.config.emitters) {
					var em = this.config.emitters[ei];
					var sig = this.getSignalById(em.signalID);
					var dt = dp / sig.frequency;
					var spl = this.getDisplacementAtPoint(em, pos, this.state.simTime + dt);
					pseries.push(spl);
					P += spl;
				}

				/* Disabled supersampling.
				 * // calc RMS difference of timeshifted pressures from unshifted pressure 
				 * }
				 * //pseries[Math.round(pseries.length/2)]
				 */
				
				maxPower = Math.max(maxPower, P);
				pAvg = P / this.config.emitters.length;
				
				/* Disabled supersampling.
				 *   } 
				 * }
				 */

				if (calcCohere) {
					// Approximate coherence as the RMS diff of emitter displacement contributions.
					for (var psi = 0; psi < pseries.length; psi++) {
						D += Math.pow(Math.abs(pseries[psi] - pAvg), 2);
					}
					D = Math.sqrt(D / pseries.length);
				}

				// produce a pixel colour.

				// show SPL as departure from medium blue.
				var blue = Math.min(255, Math.max(0, Math.round(127 + P * 350 / maxEmit)));

				// invert the RMS temporal difference to get a coherence
				// indicator.
				var red = 255 - Math.round(60 * D);
				if (red < 0)
					red = 0;
				var ip = (y * w + x) * 4;

				// write to colour channels
				if (rstyle == "Cohere+Disp") {
					ibuff.data[ip + 0] = red; // red
					ibuff.data[ip + 1] = 0; // green
					ibuff.data[ip + 2] = blue; // blue
					ibuff.data[ip + 3] = 255; // alpha
				} else if (rstyle == "Disp") {
					ibuff.data[ip + 0] = 0; // red
					ibuff.data[ip + 1] = 0; // green
					ibuff.data[ip + 2] = blue; // blue
					ibuff.data[ip + 3] = 255; // alpha
				} else if (rstyle == "Cohere") {
					ibuff.data[ip + 0] = red; // red
					ibuff.data[ip + 1] = 0; // green
					ibuff.data[ip + 2] = 0; // blue
					ibuff.data[ip + 3] = 255; // alpha
				}
				
			} //horizontal loop
		} //vertical loop

		// render the emitters as green pixels
		for ( var ei in this.config.emitters) {
			var em = this.config.emitters[ei];
			if (!simArea.contains(em.position)) continue;
			var emPix = VecUtil.sub(this.modelToImage(em.position, this.config.simArea, canvasDims), canvasRegion.topLeft);
			x = emPix[0];
			y = emPix[1];
			var ip = (y * w + x) * 4;
			ibuff.data[ip + 0] = 0;
			ibuff.data[ip + 1] = 255;
			ibuff.data[ip + 2] = 0;
			ibuff.data[ip + 3] = 255; // alpha
		}
		
		context.putImageData(ibuff, canvasRegion.topLeft[0], canvasRegion.topLeft[1]);

		//Render some stats, even though they can be shown separately in HTML labels etc.
		/*context.strokeStyle = "white";
		context.font = "normal 10px serif";
		context.strokeText("t="+(this.state.simTime.toFixed(3).toString()), 20,20 );
		 */
	},
	
	
	/** Render a region of current simulation wave state to a HTML canvas element. */
	renderRegionToCanvas: function(simRegion, canvas, rstyle) {
		var context = canvas.getContext('2d');
		context.setTransform(1, 0, 0, 1, 0, 0);
		this._SimAndRenderRegion(simRegion, context, rstyle);		
	}
	
  };
 
  bf._handleNextSimTask = function() {
		return bf.doNextTask();
  }
  
  bf.config=conf;
  return bf;
}
