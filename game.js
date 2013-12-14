(function() {
	function fading(val, by) {
		if (val != 0) {
			if (val > 0) {
				val -= by;
				if (val < 0)
					val = 0;
			} else {
				val += by;
				if (val > 0)
					val = 0;
			}
		}

		return val;
	};

	var palette = ['#09121a', '#112533', '#1a374d', '#234966', '#2b5c80', '#346e99', '#3d80b3', '#4593cc'];

	engine = new Engine("render");
	engine.setClearStyle(palette[0]);

	/**
	 * Game scene
	 */
	function Game() {

		this.cx = this.cy = 0;

		function MapTile(canPass, imageID) {
			this.canPass = canPass;
			this.imageID = imageID;
		};

		/**
		 * Game map
		 */
		function Map() {
			this.tilesPalette = engine.getSprite('tiles');
			this.tilesPalette.initAnimation(32, 32, 1);
			this.mapData = [];

			this.realWidth = 0;
			this.realHeight = 0;

			this.cellsx = 0;
			this.cellsy = 0;

			this.gravity = 0.3;

			this.player = null;

			/**
			 * Generate MapTile from imageData color
			 */
			function tileFactory(color) {
				switch (color.getRGBHex()) {
					case '#ffffff':
						return new MapTile(false, 0);
					default:
						return null;
				}
			};

			/**
			 * Create map from image data
			 */
			this.onadded = function(addedTo) {
				var tmpCanvas = document.createElement('canvas');
				var ctx = tmpCanvas.getContext('2d');
				ctx.drawImage(this.image, 0, 0);
				var imageData = ctx.getImageData(0, 0, this.image.width, this.image.height);
				this.mapData = new Array(imageData.width);

				for (var k = 0; k < imageData.width; k++) {
					this.mapData[k] = new Array(imageData.height);
				};

				var mapImageCanvas = document.createElement('canvas');
				mapImageCanvas.width = imageData.width * 32;
				mapImageCanvas.height = imageData.height * 32;
				var mapCtx = mapImageCanvas.getContext('2d');

				mapCtx.fillStyle = '#fff';

				for (var j = 0; j < imageData.height; j++) {
					for (var i = 0; i < imageData.width; i++) {
						var pixelPos = (j * imageData.width + i) * 4;
						var color = new Color(imageData.data[pixelPos], imageData.data[pixelPos + 1], imageData.data[pixelPos + 2], imageData.data[pixelPos + 3]);
						this.mapData[i][j] = tileFactory(color);

						if (this.mapData[i][j] != null) {
							this.tilesPalette.renderFrame(mapCtx, this.mapData[i][j].imageID, this.globalX() + i * 32, this.globalY() + j * 32);
						}
					};
				};

				this.image = mapImageCanvas;
				this.cellsx = imageData.width;
				this.cellsy = imageData.height;
				this.width = imageData.width * 32;
				this.height = imageData.height * 32;
				this.cx = this.cy = 0;
			};

			this.onupdate = function(deltaTime) {

			};
		};
		Map.prototype = engine.getSprite('map');

		function CollisionObject() {
			this.boundingWidth = 0;
			this.boundingHeight = 0;

			this.oncollision = function(dx, dy) {};

			this.collision = function() {
				if ((this.parent != null) && (this.parent instanceof Map)) {
					var map = this.parent;

					/** map boundarys **/
					if (this.x - this.boundingWidth < 0) {
						this.x = this.width - this.boundingWidth;
					}

					if (this.y - this.boundingHeight < 0) {
						this.y = this.height - this.boundingHeight;
					}

					if (this.x + this.boundingWidth > map.width) {
						this.x = map.width - this.boundingWidth;
					}

					if (this.y + this.boundingHeight > map.height) {
						this.y = map.height - this.boundingHeight;
					}

					var mapData = map.mapData;
					var cellX = Math.floor(this.x / 32);
					var cellY = Math.floor(this.y / 32);

					var fromCellX = cellX - 3;
					if (fromCellX < 0) fromCellX = 0;

					var toCellX = cellX + 3;
					if (toCellX >= map.cellsx) toCellX = map.cellsx - 1;

					var fromCellY = cellY - 3;
					if (fromCellY < 0) fromCellY = 0;

					var toCellY = cellY + 3;
					if (toCellY >= map.cellsy) toCellY = map.cellsy - 1;

					/** @todo too may checks **/
					for (var i = fromCellX; i < toCellX; i++) {
						for (var j = fromCellY; j < toCellY; j++) {
							if ((mapData[i][j] !== null) && (!mapData[i][j].canPass)) {
								var dx = (this.x) - (i * 32 + 16);
								var dy = (this.y) - (j * 32 + 16);

								var mindx = ((this.boundingWidth) + 16);
								var mindy = ((this.boundingHeight) + 16);

								if ((Math.abs(dx) < mindx) && (Math.abs(dy) < mindy)) {
									var offsetx = mindx - Math.abs(dx);
									var offsety = mindy - Math.abs(dy);

									if (Math.abs(offsetx) > Math.abs(offsety)) {
										if (dy < 0) {
											this.y -= offsety;
											this.oncollision(0, -offsety);
										} else {
											this.y += offsety;
											this.oncollision(0, offsety);
										}
									} else if (Math.abs(offsetx) < Math.abs(offsety)) {
										if (dx < 0) {
											this.x -= offsetx;
											this.oncollision(-offsetx, 0);
										} else {
											this.x += offsetx;
											this.oncollision(offsetx, 0);
										}
									} else {
										console.log('corner?');
									}
								}
							}
						};
					};
				}
			}
		};
		CollisionObject.prototype = new Sprite();

		function Blood() {
			this.xspeed = 0;
			this.yspeed = 0;
			this.ttl = 1000 + Math.random() * 1000;

			engine.initSprite(this, 'blood');

			var newSize = 5 + Math.random() * 5;
			this.width = this.height = newSize;
			this.boundingWidth = this.boundingHeight = newSize / 2;

			this.oncollision = function(dx, dy) {
				if (dy > 0) {
					this.yspeed = 0;
				}

				if (dy < 0) {
					this.yspeed = -this.yspeed * 0.5;
				}

				if (dx != 0) {
					this.xspeed = -this.xspeed * 0.9;
				}
			};

			this.onupdate = function(deltaTime) {
				if (this.ttl > 0) {
					if (this.ttl < 1000) {
						this.alpha = this.ttl / 1000;
					}
					this.x += this.xspeed;
					this.y += this.yspeed;
					this.ttl -= deltaTime;

					this.collision();


					this.xspeed = fading(this.xspeed, 0.01);
					this.yspeed += this.parent.gravity;
				} else {
					this.parent.removeChild(this);
				}
			};
		};
		Blood.prototype = new CollisionObject();

		/**
		 * Bleeding effect
		 */
		function Bleed() {
			var thisBleed = this;

			this.bloodcount = 20;
			this.iterations = 1;
			this.emmitDelay = 200;
			this.spread = 20;

			function emmit() {
				console.log(thisBleed);
				for (var i = 0; i < thisBleed.bloodcount; i++) {
					var newBlood = new Blood();
					newBlood.xspeed = -3 + Math.random() * 6;
					newBlood.yspeed = -6 + Math.random() * 8;
					newBlood.x = thisBleed.x - ((thisBleed.spread / 2) + Math.random() * thisBleed.spread);
					newBlood.y = thisBleed.y - ((thisBleed.spread / 2) + Math.random() * thisBleed.spread);
					thisBleed.parent.addChild(newBlood);
				};

				thisBleed.iterations--;
				if (thisBleed.iterations > 0) {
					setTimeout(emmit, thisBleed.emmitDelay);
				}
			};

			this.start = function(iterations, bloodcount, delay) {
				this.bloodcount = typeof(bloodcount == "undefined") ? this.bloodcount : iterations;
				this.iterations = typeof(iterations == "undefined") ? this.iterations : bloodcount;
				this.emmitDelay = typeof(delay == "undefined") ? this.emmitDelay : delay;

				if (this.iterations > 0) {
					emmit();
				}
			};
		};
		Bleed.prototype = new Sprite();

		function Mob() {
			this.health = 100;
			this.hitPower = 5;
			this.map = null;
			this.inJump = true;
			this.yspeed = 0;
			this.xspeed = 0;
			this.moveSpeed = 3;
			this.jumpPower = 8;
			this.orientation = "right";
			this.external_xspeed = 0;
			this.external_yspeed = 0;
			this.dead = false;

			this.oncollision = function(dx, dy) {
				if (dy < 0) {
					this.inJump = false;
					this.yspeed = 0;
				}

				if (dy > 0) {
					this.yspeed = 0;
				}
			};

			this.moveleft = function() {
				this.xspeed = -this.moveSpeed;
			};

			this.moveright = function() {
				this.xspeed = this.moveSpeed;
			};

			this.jump = function() {
				if (!this.inJump) {
					this.inJump = true;
					this.yspeed = -this.jumpPower;
					this.engine.playSound('jump-low');
				}
			};

			this.mobupdate = function(deltaTime) {
				this.x += this.xspeed + this.external_xspeed;
				this.y += this.yspeed + this.external_yspeed;

				this.yspeed += this.parent.gravity;
				this.xspeed = fading(this.xspeed, 0.2);

				if (this.health > 0) {
					this.external_xspeed = fading(this.external_xspeed, 0.15);
					this.external_yspeed = fading(this.external_yspeed, 0.15);
					this.collision();
				} else {
					this.alpha = fading(this.alpha, 0.005);
					if (!this.dead) {
						this.dead = true;
						this.yspeed = -2;

						var mobtodel = this;
						setTimeout(function() {
							mobtodel.parent.removeChild(mobtodel);
						}, 2000);
					}
				}
			};
		};
		Mob.prototype = new CollisionObject();

		function Enemy() {
			engine.initSprite(this, 'three');

			this.initAnimation(64, 96, 12);
			this.createAnimClip('idle', 0, 1, 2);
			this.setAnim('idle');

			this.boundingWidth = 24;
			this.boundingHeight = 48;

			this.onupdate = function(deltaTime) {
				this.mobupdate(deltaTime);

				var player = this.parent.player;

				if (this.health > 0)
					this.flipHorizontal = (player.x < this.x);
			};
		};
		Enemy.prototype = new Mob();

		function Player() {


			function WeaponOne() {

			};

			WeaponOne.prototype = engine.getSprite('weapone-one');

			engine.initSprite(this, 'char');
			this.initAnimation(32, 64, 12);

			this.createAnimClip('idle', 0, 1, 2);
			this.createAnimClip('run', 2, 5, 12);
			this.createAnimClip('jump', 6, 6, 1);
			this.createAnimClip('atack', 1, 1, 1);
			this.setAnim('idle');

			this.boundingWidth = 6;
			this.boundingHeight = 32;

			this.x = 100;
			this.y = 100;

			this.weapon = new WeaponOne();

			this.hitPower = 50;

			this.addChild(this.weapon);

			this.attackState = false;
			this.attackLock = false;

			function finishAttack(player) {
				player.attackState = false;
				player.weapon.x = 0;
			}

			this.attack = function() {
				if ((!this.attackState) && (!this.attackLock) && (this.weapon != null)) {
					this.weapon.x = this.flipHorizontal ? -20 : 20;
					this.attackState = true;
					this.attackLock = true;

					for (var i = 0; i < map.children.length; i++) {
						if (map.children[i] instanceof Enemy) {
							var enemy = map.children[i];
							if (enemy.health > 0) {
								var v = new Vector(enemy.x - this.x, enemy.y - this.y);
								if (v.length() <= (enemy.boundingWidth + this.boundingWidth) + 30) {
									enemy.health -= this.hitPower;
									var newBleed = new Bleed();
									newBleed.x = this.x + (this.flipHorizontal ? -20 - this.weapon.width : 20 + this.weapon.width);
									newBleed.y = this.y;
									map.addChild(newBleed);
									newBleed.start();
									if (enemy.x > this.x) {
										enemy.external_xspeed += 2.5;
									} else {
										enemy.external_xspeed -= 2.5;
									}
									enemy.external_yspeed = -2;
								}
							}
						}
					};

					engine.playSound('hit2');

					player = this;
					setTimeout(function() {
						finishAttack(player);
					}, 100);
				}
			};

			this.onupdate = function(deltaTime) {
				if (engine.isLeft()) {
					this.moveleft();
					this.setAnim('run');
					this.flipHorizontal = this.weapon.flipHorizontal = true;
				}
				if (engine.isRight()) {
					this.moveright();
					this.setAnim('run');
					this.flipHorizontal = this.weapon.flipHorizontal = false;
				}

				if (engine.isKeysDown([Keyboard.key_z, Keyboard.key_x, Keyboard.key_c])) {
					this.attack();
				} else {
					this.attackLock = false;
				}

				if ((!engine.isLeft()) && (!engine.isRight())) this.setAnim('idle');

				if (engine.isUp() || engine.isKeyDown(Keyboard.key_space)) {
					this.jump();
				}

				if (this.inJump) {
					this.setAnim('jump');
				}

				this.mobupdate(deltaTime);

				this.parent.x = engine.canvas.width / 2 - this.x;
				if (this.parent.x > 0) this.parent.x = 0;
				if (this.parent.x + this.parent.width < engine.canvas.width) this.parent.x = -this.parent.width + engine.canvas.width;

				this.parent.y = engine.canvas.height / 2 - this.y;
				if (this.parent.y > 0) this.parent.y = 0;
				if (this.parent.y + this.parent.height < engine.canvas.height) this.parent.y = -this.parent.height + engine.canvas.height;
			}
		};
		Player.prototype = new Mob();

		var player = new Player();
		var map = new Map();
		map.player = player;
		player.map = map;
		map.addChild(player);

		for (var i = 0; i < 7; i++) {
			var newEnemy = new Enemy();
			newEnemy.x = 300 + i * 100;
			newEnemy.y = 100 + i * 10;

			map.addChild(newEnemy);
		};

		this.onadded = function(toengine) {
			this.addChild(map);
		};
	};
	Game.prototype = new Sprite();

	/**
	 * Intro scene
	 */
	function IntroScene() {

	};
	IntroScene.prototype = new Sprite();

	function start() {
		engine.clearSyle = palette[0];
		engine.setRootSprite(new Game());
	};

	engine.loadResources({
		'images': {
			'tiles': 'maps/tile-palette.png',
			'map': 'maps/map.png',
			'char': 'char.png',
			'three': 'mobs/three-enemy.png',
			'weapone-one': 'weapon/one.png',
			'blood': 'blood.png'
		},
		'sounds': {
			'jump-low': 'jump-low.ogg',
			'hit2': 'hit2.ogg'
		}
	}, 'data', function() {
		start();
	});
})();