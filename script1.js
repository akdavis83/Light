/* ============================================ */
    /* ANIMATION POLYFILLS
    /* ============================================ */

    /**
     * Request animation frame
     */
    var raf = (function() {
      return  window.requestAnimationFrame       ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame    ||
              window.msRequestAnimationFrame     ||
              window.oRequestAnimationFrame      ||
              function(callback) {
                return window.setTimeout(callback, 1000 / 60);
              };
    })();

    /**
     * Cancel animation frame
     */
    var caf = (function() {
      return  window.cancelAnimationFrame       ||
              window.webkitCancelAnimationFrame ||
              window.mozCancelAnimationFrame    ||
              window.msCancelAnimationFrame     ||
              window.oCancelAnimationFrame      ||
              function(callback) {
                window.clearTimeout(callback);
              };
    })();

    /* ============================================ */
    /* HELPER FUNCTIONS
    /* ============================================ */

    /**
     * Converts hex colors to RGB values
     * @param  {String} hex Hex Color
     * @return {Object}     RGB Object
     */
    function getRGB(hex) {
      var arrBuff = new ArrayBuffer(4);
      var vw = new DataView(arrBuff);
      vw.setUint32(0,parseInt(hex.slice(1), 16),false);
      var arrByte = new Uint8Array(arrBuff);

      return {
        red: arrByte[1],
        green: arrByte[2],
        blue: arrByte[3],
        toString: function() {
          return arrByte[1] + ',' + arrByte[2] + ',' + arrByte[3];
        }
      };
    }

    /**
     * Generates a random float number.
     * @param  {Number} min Minimum value
     * @param  {Number} max Maximum value
     * @return {Number}     The generated random number
     */
    function rand(min, max) {
      if (typeof max === 'undefined') {
        max = min;
        min = 0;
      }

      return min + Math.random() * (max - min);
    }

    /**
     * Generates a random integer.
     * @param  {Number} min Minimum value
     * @param  {Number} max Maximum value
     * @return {Number}     The generated random integer
     */
    function irand(min, max) {
      return Math.floor(rand(min, max));
    }

    /**
     * Stops event
     * @param  {Event} e Event to be stopped
     */
    function stopEvent(e) {
      e.preventDefault();
      e.stopPropagation();
      e.cancelBubble = true;
      e.returnValue = false;
    }

    /* ============================================ */
    /* RENDER
    /* ============================================ */

    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');
    
    (function render() {
      context.clearRect(0, 0, canvas.width, canvas.height);

      canvas.dispatchEvent(new Event('update'));
      canvas.dispatchEvent(new Event('render'));

      raf(render);
    }());
    
    window.addEventListener('resize', (function resizeCanvas() {
      canvas.width = 2 * window.innerWidth;
      canvas.height = 2 * window.innerHeight;
      canvas.style.width = 0.5 * canvas.width + 'px';
      canvas.style.height = 0.5 * canvas.height + 'px';
    
      // throttle
      var timeout;
      return function() {
        clearTimeout(timeout);
        setTimeout(resizeCanvas, 300);
      };
    }()));

    /* ============================================ */
    /* CANVAS OBJECT
    /* ============================================ */

    function CanvasObject(canvas, config) {
      if (canvas) {
        this.canvas = canvas;
        this.context = this.canvas.getContext('2d');
        
        // initialize
        this.config = Object.assign({}, this.defaults, config);
        Object.assign(this, this.config);

        // listen for 'update' and 'render' events on the canvas element
        this.__updateEventListener = this.update.bind(this);
        this.__renderEventListener = this.render.bind(this);

        this.canvas.addEventListener('update', this.__updateEventListener);
        this.canvas.addEventListener('render', this.__renderEventListener);
      }
    }

    CanvasObject.prototype = {
      defaults: {
        x: 0,
        y: 0,
        onDeath: null,
      },

      update: function() {

      },

      render: function() {
        
      },

      destroy: function() {
        this.canvas.removeEventListener('update', this.__updateEventListener);
        this.canvas.removeEventListener('render', this.__renderEventListener);

        if (this.config.onDeath) {
          this.config.onDeath.call(this);
        }
      }
    };

    /* ============================================ */
    /* SOURCE
    /* ============================================ */

    function Source(canvas, config) {
      CanvasObject.apply(this, Array.prototype.slice.call(arguments));

      this.targetX = this.x;
      this.targetY = this.y;

      this.size = 0;
    }

    Source.prototype = Object.create(CanvasObject.prototype);
    
    Object.assign(Source.prototype, {
      constructor: Source
    }, {
      defaults: Object.assign({}, CanvasObject.prototype.defaults, {
        ignited: false,
        targetX: 0,
        targetY: 0,
        size: 40,
        density: 10,
        flames: {},
        flamesCount: 0,
      }),

      createFlame: function(config) {
        this.flames[this.flamesCount] = new Flame(this.canvas, Object.assign(config,{
          onDeath: (function(id, self) {
            return function() {
              self.flames[id] = null;
              delete self.flames[id];
            }
          }(this.flamesCount, this))})
        );

        this.flamesCount++;
      },

      update: function() {
        var sizeFactor = this.size / this.config.size;

        this.x += (this.targetX - this.x) / 15;
        this.y += (this.targetY - this.y) / 15;

        if (this.ignited) {
          for (var i = 0; i < Math.floor(sizeFactor * this.density); i++) {
            var a = 2 * Math.random() * Math.PI;
            var p = rand(0, 0.5 * this.size);

            this.createFlame({
              source: this,
              x: this.x,
              y: this.y,
              dx: p * Math.cos(a),
              dy: p * Math.sin(a),
              vy: 2 * this.size * rand(0.05, 0.1),
              sizeDecay: 2 * (1 / sizeFactor) * rand(0.3, 0.3 + 0.025 * this.size),
              flameSize: rand(1, 0.5 * this.size),
              amplitude: rand(-4 * this.size, 4 * this.size),
              red: 250 + 5 * Math.min(1, this.size / 20),
              green: 100 + 155 * Math.min(1, this.size / 20),
              blue: 100 + 155 * Math.min(1, this.size / 20),
            });
          }
        } else {
          this.size += (0 - this.size) / 15;
        }
      }
    });

    /* ============================================ */
    /* FLAME
    /* ============================================ */

    function Flame(canvas, config) {
      CanvasObject.apply(this, Array.prototype.slice.call(arguments));

      this.x += this.dx;
      this.y += this.dy;
    }

    Flame.prototype = Object.create(CanvasObject.prototype);
    
    Object.assign(Flame.prototype, {
      constructor: Flame
    }, {
      defaults: Object.assign({}, CanvasObject.prototype.defaults, {
        dx: 0,
        dy: 0,
        wt: 0,
        wta: 0.075,
        vy: 2,
        flameSize: 20,
        size: 0,
        sizeDecay: 0.2,
        amplitude: 10,
        amplitudeDecay: 0.85,
        opacity: 1,
        red: 255,
        green: 255,
        blue: 255,
      }),

      update: function() {
        // flame position
        this.wt += this.wta;
        this.amplitude *= this.amplitudeDecay;
        this.x = this.config.x + (this.amplitude) * Math.sin(this.wt);
        this.y -= this.vy;

        // flame size
        this.size += (this.flameSize - this.size) / 2;
        this.flameSize -= this.sizeDecay;

        // flame color
        this.red = Math.floor(rand(0.95, 0.96) * this.red);
        this.green = Math.floor(rand(0.8, 0.87) * this.green);
        this.blue = Math.floor(rand(0.18, 0.23) * this.blue);

        // flame opacity
        this.config.opacity = this.config.size / this.config.targetSize;

        if (this.size <= 0) {
          this.destroy();
        }
      },

      render: function() {
        if (this.size <= 0) {
          return;
        }

        var s = 1.5 * this.flameSize / this.config.flameSize;
        
        this.context.beginPath();
        
        this.context.moveTo(this.x, this.y);
        this.context.bezierCurveTo(
          this.x + 2 * 0.66 * this.size,
          this.y,
          this.x + 2 * 0.66 * s * this.size,
          this.y - 2 * (0.5 * s + 0.5) * this.size,
          this.x,
          this.y - 2 * this.size
        );

        this.context.moveTo(this.x, this.y);
        this.context.bezierCurveTo(
          this.x - 2 * 0.66 * this.size,
          this.y,
          this.x - 2 * 0.66 * s * this.size,
          this.y - 2 * (0.5 * s + 0.5) * this.size,
          this.x,
          this.y - 2 * this.size
        );

        this.context.fillStyle = 'rgba(' + this.red + ', ' + this.green + ', ' + this.blue + ', ' + this.opacity + ')';
        this.context.fill();
      },
    });

    /* ============================================ */
    /* TORCH
    /* ============================================ */

    function Torch(element, source) {
      this.element = element;
      this.source = source;

      this.startDrag = this.startDrag.bind(this);
      this.stopDrag = this.stopDrag.bind(this);
      this.update = this.update.bind(this);

      this.element.addEventListener('mousedown', this.startDrag);
 this.element.addEventListener('touchstart', this.startDrag, {
    passive: false
});
      this.source.canvas.addEventListener('update', this.update);

      this.render();
    }

    Torch.prototype = {
      _x: 0,
      _y: 0,
      dx: 0,
      dy: 0,
      ox: 0,
      oy: 0,
      mx: 0,
      my: 0,
      vx: 0,
      vy: 0,
      wt: 0,
      width: 51,
      height: 93,
      dragging: false,
      ease: 15,

      startDrag: function(e) {
        this.ox = this.x;
        this.oy = this.y;
        this.mx = e.pageX;
        this.my = e.pageY;

        this.dragging = true;

        window.addEventListener('mouseup', this.stopDrag);
        window.addEventListener('touchend', this.stopDrag, {
    passive: false
});
        this.element.dispatchEvent(new Event('startDrag'));

        stopEvent(e);
        
        return false;
      },

      stopDrag: function(e) {
        this.dragging = false;

        window.removeEventListener('mouseup', this.stopDrag);
        this.element.dispatchEvent(new Event('stopDrag'));

        stopEvent(e);
        
        return false;
      },

      update: function() {
        if (this.dragging) {
          var x = this.x + (mouseX - this.x) / 15;
          var y = this.y + (mouseY - 15 - this.y) / 15;

          this.dx = x - this.x;
          this.dy = y - this.y;

          this.x = x + this.vx;
          this.y = y + this.vy;

          this.ease = 200;

          var d = Math.sqrt(this.dx * this.dx + this.dy * this.dy);

          this.source.size += (this.source.config.size * (1 - Math.min(0.8, Math.max(0, d / 20))) - this.source.size) / 15;
        } else {
          this.dx *= 0.95;
          this.dy *= 0.95;

          this.x += (0.25 * this.source.canvas.width - this.x) / this.ease;
          this.y += (0.25 * this.source.canvas.height - this.y) / this.ease;

          this.x += this.dx;
          this.y += this.dy;

          this.x += 0.25 * Math.sin(10 + this.wt);
          this.y += 0.5 * Math.sin(this.wt);

          this.wt += 0.025;

          this.ease = Math.max(15, this.ease - 1);

          this.source.size += (0 - this.source.size) / 15;
        }

        this.source.targetX = this.source.x = 2 * this.x - 3;
        this.source.targetY = this.source.y = 2 * this.y - 5;

        this.element.dispatchEvent(new Event('update'));

        this.render();
      },

      set x(val) {
        this._x = val;
      },

      get x() {
        return this._x;
      },

      set y(val) {
        this._y = val;
      },

      get y() {
        return this._y;
      },

      render: function() {
        var transforms = [];

        // position
        transforms.push('translate3d(' + (this.x - 0.5 * this.width - 2) + 'px, ' + (this.y - 19) + 'px, 0)');

        // rotation
        transforms.push('rotate(' + this.dx + 'deg)');

        this.element.style.transform = transforms.join(' ');
      }
    }

    /* ============================================ */
    /* INIT
    /* ============================================ */

    // mouse position -----------------------------

    var mouseX = 0;
    var mouseY = 0;
    
    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('touchmove', updateMousePosition, {
    passive: false
});

    function updateMousePosition(e) {
      if (e.touches) {
        mouseX = e.touches[0].pageX;
        mouseY = e.touches[0].pageY;
      } else {
        mouseX = e.pageX;
        mouseY = e.pageY;
      }
    }

    // move source --------------------------------

    var source = new Source(document.getElementById('canvas'));
    var torch = new Torch(document.getElementById('torch'), source);
    var torchLight = document.querySelector('#torch .light');

    source.ignited = true;

    torch.x = 0.25 * canvas.width;
    torch.y = 0.25 * canvas.height;

    torch.element.addEventListener('startDrag', function() {
      // experiment is now interactive
      document.body.classList.add('interactive');

      // torch is ignited
      document.body.classList.add('ignited');
    });

    torch.element.addEventListener('stopDrag', function() {
      // torch is not ignited
      document.body.classList.remove('ignited');
    });

    torch.element.addEventListener('update', function() {
      var sizeFactor = source.size / source.config.size;

      var dw = rand(-15, 15);
      var dh = rand(-15, 15);

      if (document.body.classList.contains('ignited')) {
        spotlight.style.left = 0.5 * source.x + 'px';
        spotlight.style.top = 0.5 * source.y + 'px';
        spotlight.style.marginTop = 0;
        spotlight.style.transition = 'none';

        spotlight.style.opacity = sizeFactor;

        torchLight.style.opacity = sizeFactor * rand(0.3, 0.5);
      } else {
        spotlight.style.opacity = 0.75 * sizeFactor;

        spotlight.style.marginTop = -15 * source.size + 'px';
        spotlight.style.transition = 'margin-top 600ms';

        torchLight.style.opacity = '';
      }

      spotlight.style.width = Math.floor(sizeFactor * (400 + dw)) + 'px';
      spotlight.style.height = Math.floor(sizeFactor * (400 + dh)) + 'px';
    });



if (!!('ontouchstart' in window)) {
      document.body.classList.add('is-touch');
    }