(function() {
	function aspire(value, toValue, step, callback) {
		if (value != toValue) {
			if (value > toValue) {
				value -= step;
				if (value <= toValue) {
					value = toValue;
					if (typeof callback != "undefined")
						callback();
				}
			} else {
				value += step;
				if (value >= toValue) {
					value = toValue;
					if (typeof callback != "undefined")
						callback();
				}
			}
		}

		return value;
	};

	function fading(val, by) {
		return aspire(val, 0, by);
	};

	var palette = ['#09121a', '#112533', '#1a374d', '#234966', '#2b5c80', '#346e99', '#3d80b3', '#4593cc'];

	engine = new Engine("render");
	engine.setClearStyle(palette[0]);

	/**
	 * Game scene
	 */
	function Game() {

		this.cx = this.cy = 0;

		this.currentMap = null;
		this.game = null;
		this.player = null;

		function MapTile(canPass, imageID) {
			this.canPass = canPass;
			this.imageID = imageID;
		};

		function MapTrigger() {
			this.triggered = false;
			this.radius = 100;
			this.ontrigger = function() {};
		};
		MapTrigger.prototype = new Sprite();

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

			this.playerx = 0;
			this.playery = 0;

			this.exitx = 0;
			this.exity = 0;

			this.triggers = new Array();

			/**
			 * Generate MapTile from imageData color
			 */
			this.tileFactory = function(color, posx, posy) {
				var realx = posx * 32 + 16;
				var realy = posy * 32 + 16;
				switch (color.getRGBHex()) {
					case '#ff00':
						var te = new ThreeEnemy();
						te.x = realx;
						te.y = realy;
						this.addChild(te);
						return null;
					case '#ff0ff':
						var se = new SevenEnemy();
						se.x = realx;
						se.y = realy;
						this.addChild(se);
						return null;
					case '#ffffff':
						return new MapTile(false, 0);
					case '#111111':
						return new MapTile(false, 1);
					case '#0ff0':
						this.exitx = realx;
						this.exity = realy;
						return new MapTile(true, 4);
					case '#ffff0':
						this.playerx = realx;
						this.playery = realy;

						return null;
					default:
						return null;
				}
			};

			this.onnextlevel = function() {
				function WIN() {
					this.cx = 0;
					this.cy = 0;
				};
				WIN.prototype = engine.getSprite('win');

				var w = new WIN();
				engine.setRootSprite(w);
			};

			/**
			 * Create map from image data
			 */
			this.loadMap = function(mapName) {
				engine.initSprite(this, mapName);
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
						this.mapData[i][j] = this.tileFactory(color, i, j);

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
				if (!this.player.levelPassed) {
					this.alpha = aspire(this.alpha, 1, 0.005);
					var v = new Vector(this.exitx - this.player.x, this.exity - this.player.y);
					if (v.length() < 50) {
						this.player.controll = false;
						this.player.levelPassed = true;
					}

					for (var i = 0; i < this.triggers.length; i++) {
						if (!this.triggers[i].triggered) {
							var tl = new Vector(this.triggers[i].x - this.player.x, this.triggers[i].y - this.player.y);
							if (tl.length() < this.triggers[i].radius) {
								this.triggers[i].ontrigger();
							}
						}
					};
				} else {
					var map = this;
					this.alpha = aspire(this.alpha, 0, 0.025, function() {
						map.onnextlevel();
					});
					this.player.moveright = true;
					this.player.setAnim('run');
				}
			};
		};
		Map.prototype = new Sprite();

		function Dialog(frame, ttl, callback) {
			engine.playSound('say');
			this.initAnimation(300, 15, 1);
			this.currentFrame = frame;
			this.pause();
			this.alpha = 0;

			this.ttl = ttl;

			this.onupdate = function(deltaTime) {
				if (this.ttl <= 0) {
					var thisdialog = this;
					this.alpha = aspire(this.alpha, 0, 0.1, function() {
						if (typeof callback != "undefined") callback();
						thisdialog.parent.removeChild(thisdialog);
					})
				} else {
					if (this.alpha != 1) {
						this.alpha = aspire(this.alpha, 1, 0.08);
					} else {
						this.ttl -= deltaTime;
					}
				}
			};
		};
		Dialog.prototype = engine.getSprite('dialog');

		function Level1() {
			this.loadMap('level1');
			this.moveInstructions = engine.getSprite('inst-move');

			this.onnextlevel = function() {
				this.game.initLevel(new Level2());
			};

			this.onadded = function() {

				var p = this.player;
				setTimeout(function() {
					var whereami = new Dialog(0, 4000);
					p.say(whereami);
				}, 2000);

				this.moveInstructions.x = 300;
				this.moveInstructions.y = 600;
				this.moveInstructions.alpha = 0;

				var m = this;

				function God() {};
				God.prototype = new Mob();

				function WeaponAnim(enemy) {
					engine.initSprite(this, 'weapone-one');
					this.boundingWidth = this.image.width;
					this.boundingHeight = this.image.height;
					this.onupdate = function(deltaTime) {
						this.mobupdate(deltaTime);

						var v = new Vector(this.x - p.x, this.y - p.y);
						if (v.length() <= 20) {
							p.giveWeapon(new WeaponOne());
							engine.playSound('get');
							enemy.chasePlayer = true;
							this.parent.removeChild(this);
						}
					};
				};
				WeaponAnim.prototype = new Mob();

				function EnemyTrigger() {
					this.ontrigger = function() {
						this.triggered = true;
						p.controll = false;
						p.moveleft = p.moveright = false;
						p.setAnim('idle');

						var en = new ThreeEnemy();
						en.x = 1400;
						en.y = 400;
						en.xspeed = -7;
						en.flipHorizontal = true;
						en.chasePlayer = false;
						m.addChild(en);

						engine.playSound('enemy');

						var originalmapx = m.x;
						var mapT = m.x - 170;

						function moveMap(callback) {
							if (m.x > mapT) {
								m.x -= 2;
								setTimeout(moveMap, 1000 / 60);
							}
						};

						moveMap();

						setTimeout(function() {
							// Boo
							en.say(new Dialog(1, 1500, function() {
								// I'm going to kill you
								en.say(new Dialog(2, 3000, function() {
									// On now
									p.say(new Dialog(3, 2500, function() {
										// I wish I have a weapon
										p.say(new Dialog(4, 4000, function() {
											setTimeout(function() {
												var god = new God();
												god.x = (p.x + en.x) / 2;
												god.y = 400;
												m.addChild(god);
												engine.playSound('god');
												god.say(new Dialog(5, 7000, function() {
													god.say(new Dialog(6, 7000, function() {
														god.say(new Dialog(7, 7000, function() {
															god.say(new Dialog(8, 4000, function() {
																var wep = new WeaponAnim(en);
																wep.x = god.x;
																wep.y = god.y;
																m.addChild(wep);

																engine.playSound('weapon');

																setTimeout(function() {
																	god.say(new Dialog(11, 8000, function() {
																		god.say(new Dialog(9, 7000, function() {
																			god.say(new Dialog(10, 4000, function() {

																				var mapBackX = originalmapx - 18;

																				function moveMapBack(callback) {
																					if (m.x < mapBackX) {
																						m.x += 2;
																						setTimeout(moveMapBack, 1000 / 60);
																					} else {
																						p.controll = true;

																						var attackInstruction = engine.getSprite('inst-attack');
																						attackInstruction.x = god.x;
																						attackInstruction.y = p.y - 100;
																						m.addChild(attackInstruction);
																					}
																				};

																				moveMapBack();
																			}));
																		}));
																	}));
																}, 1000);
															}))
														}));
													}))
												}));
											}, 500);
										}));
									}));
								}));
							}));
						}, 1000);

					};
				};
				EnemyTrigger.prototype = new MapTrigger();

				var et = new EnemyTrigger();
				et.x = 1100;
				et.y = 640;

				this.addChild(et);

				this.triggers.push(et);


				var target = this.moveInstructions;
				this.moveInstructions.onupdate = function(deltaTime) {
					this.alpha = aspire(this.alpha, 1, 0.005);
				};

				this.addChild(this.moveInstructions);
			};
		};

		Level1.prototype = new Map();

		function Level2() {
			this.onnextlevel = function() {
				this.game.initLevel(new Level3());
			};

			this.loadMap('level2');
		};
		Level2.prototype = new Map();

		function Level3() {
			this.onadded = function() {
				var p = this.player;

				function OhShiTrigger() {
					this.ontrigger = function() {
						this.triggered = true;
						p.say(new Dialog(12, 3000));
					}
				};
				OhShiTrigger.prototype = new MapTrigger();

				var ost = new OhShiTrigger();
				ost.x = 990;
				ost.y = 480;
				this.addChild(ost);
				this.triggers.push(ost);
			};

			this.loadMap('level3');
		};
		Level3.prototype = new Map();

		/**
		 * Object to collide with the map
		 */
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

					/** @todo 3 is magic number - count it from boundingWidth/Height **/
					var toCellX = cellX + 3;
					if (toCellX > map.cellsx) toCellX = map.cellsx;

					var fromCellY = cellY - 3;
					if (fromCellY < 0) fromCellY = 0;

					var toCellY = cellY + 3;
					if (toCellY > map.cellsy) toCellY = map.cellsy;

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
									} else {
										if (dx < 0) {
											this.x -= offsetx;
											this.oncollision(-offsetx, 0);
										} else {
											this.x += offsetx;
											this.oncollision(offsetx, 0);
										}
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

		/**
		 * I am not Notch but still..
		 */
		function Mob() {
			this.healthmax = 100;
			this.health = 100;
			this.hitPower = 5;
			this.map = null;
			this.inJump = true;
			this.yspeed = 0;
			this.xspeed = 0;
			this.moveleft = false;
			this.moveright = false;
			this.moveSpeed = 3;
			this.jumpPower = 8;
			this.orientation = "right";
			this.external_xspeed = 0;
			this.external_yspeed = 0;
			this.dead = false;

			this.say = function(sayingSprite) {
				sayingSprite.x = 0;
				sayingSprite.y = -this.boundingHeight - 15;
				this.addChild(sayingSprite);
			};

			this.oncollision = function(dx, dy) {
				if (dy < 0) {
					this.inJump = false;
					this.yspeed = -this.yspeed * 0.2;
					if (Math.abs(this.yspeed) <= 0.2)
						this.yspeed = 0;
					if (this.yspeed != 0)
						engine.playSound('floor');
				}

				if (dy > 0) {
					this.yspeed = 0;
				}

				if (dx != 0) {
					this.xspeed = 0;
					this.external_xspeed = 0;
				}
			};

			this.jump = function() {
				if (!this.inJump) {
					this.inJump = true;
					this.yspeed = -this.jumpPower;
					this.engine.playSound('jump-low');
				}
			};

			this.ondeath = function() {};

			this.mobupdate = function(deltaTime) {
				if (this.moveleft) {
					this.xspeed = aspire(this.xspeed, -this.moveSpeed, 0.2);
				}

				if (this.moveright) {
					this.xspeed = aspire(this.xspeed, this.moveSpeed, 0.2);
				}

				this.x += this.xspeed + this.external_xspeed;
				this.y += this.yspeed + this.external_yspeed;

				if ((!this.moveleft) && (!this.moveright)) {
					this.xspeed = fading(this.xspeed, 0.2);
				}

				this.yspeed += this.parent.gravity;

				if (this.yspeed > 10) this.yspeed = 10;

				this.moveright = this.moveleft = false;

				if (this.health > 0) {
					this.external_xspeed = fading(this.external_xspeed, 0.15);
					this.external_yspeed = fading(this.external_yspeed, 0.15);
					this.collision();
				} else {
					this.alpha = fading(this.alpha, 0.005);
					if (!this.dead) {
						this.dead = true;
						this.yspeed = -2;

						this.ondeath();

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
			this.chasePlayer = true;
			this.chaseDistance = 400;
			this.attackDelay = 700;
			this.isAttack = false;
			this.attackDistance = 55;
			this.minimalDistance = 0;
			this.attackTime = 0;

			this.attack = function(deltaTime) {

			};

			this.checkattack = function(pdx, deltaTime) {
				var player = this.parent.player;
				if (Math.abs(pdx) < this.attackDistance) {
					if ((Math.abs(this.y - player.y) < this.boundingHeight)) {
						if (!this.isAttack) {
							player.health -= this.hitPower;
							this.isAttack = true;
							this.attackTime = this.attackDelay;
							this.setAnim('attack');
							this.attack(deltaTime);
							engine.playSound('hit');
						} else {
							if (this.attackTime <= 0) {
								this.isAttack = false;
								this.setAnim('idle');
							} else {
								this.attackTime -= deltaTime;
							}
						}
					}
				}
			};

			this.onupdate = function(deltaTime) {
				this.mobupdate(deltaTime);

				var player = this.parent.player;

				if (this.health > 0) {

					if ((this.chasePlayer) && (!player.dead)) {
						var pdx = this.x - player.x;

						this.flipHorizontal = (pdx > 0);

						if (Math.abs(pdx) < this.chaseDistance) {
							if (Math.abs(pdx) < this.minimalDistance) {
								if (player.x < this.x) {
									this.moveright = true;
									this.setAnim('run');
								} else {
									this.moveright = true;
									this.setAnim('run');
								}

								this.checkattack(pdx, deltaTime);
							} else {
								this.checkattack(pdx, deltaTime);

								if (pdx > 0) {
									this.moveleft = true;
									this.setAnim('run');
								}
								if (pdx < 0) {
									this.moveright = true;
									this.setAnim('run');
								}

								if (player.y < (this.y - this.boundingHeight / 2)) {
									this.jump();
								}
							}
						}
					} else {
						this.setAnim('idle');
					}
				}
			};
		};
		Enemy.prototype = new Mob();

		function ThreeEnemy() {
			engine.initSprite(this, 'three');

			this.moveSpeed = 4.5;

			this.initAnimation(64, 96, 12);
			this.createAnimClip('idle', 0, 1, 2);
			this.createAnimClip('run', 3, 5, 15);
			this.createAnimClip('attack', 6, 6, 2);
			this.setAnim('idle');

			this.boundingWidth = 24;
			this.boundingHeight = 48;

			this.attack = function(deltaTime) {
				var p = this.parent.player;

				if (p.x < this.x) {
					p.external_xspeed = -3;
				} else {
					p.external_xspeed = 3;
				}

				p.external_yspeed = -4;
			};
		};
		ThreeEnemy.prototype = new Enemy();

		function SevenEnemy() {

			function Strike() {
				this.initAnimation(250, 32, 10);
				this.createAnimClip('s', 0, 2, 5);
				this.setAnim('s');
				this.cx = 0;

				this.stop();
				this.visible = false;

				this.attack = function() {
					this.stop();
					this.play();
					this.visible = true;
				}

				this.onanimationfinished = function() {
					this.stop();
					this.visible = false;
				};
			};
			Strike.prototype = engine.getSprite('strike');

			engine.initSprite(this, 'seven');
			this.moveSpeed = 2.5;
			this.attackDistance = 250;
			this.minimalDistance = 200;
			this.initAnimation(64, 128);
			this.createAnimClip('idle', 0, 1, 2);
			this.createAnimClip('run', 2, 5, 15);
			this.createAnimClip('attack', 6, 6, 2);
			this.setAnim('idle');
			this.boundingWidth = 32;
			this.boundingHeight = 64;
			this.hitPower = 10;
			this.attackDelay = 2000;

			this.strike = new Strike();

			this.addChild(this.strike);

			this.attack = function(deltaTime) {
				if (this.flipHorizontal) {
					this.strike.flipHorizontal = true;
					this.strike.x = -this.strike.width;

				} else {
					this.strike.flipHorizontal = false;
					this.strike.x = 0;
				}
				this.strike.attack();

				var p = this.parent.player;

				if (p.x < this.x) {
					p.external_xspeed = -5;
				} else {
					p.external_xspeed = 5;
				}

				p.external_yspeed = -6;
			};
		};
		SevenEnemy.prototype = new Enemy();

		function Weapon() {

		};
		Weapon.prototype = new Sprite();

		function WeaponOne() {
			engine.initSprite(this, 'weapone-one');
		};

		WeaponOne.prototype = new Weapon();

		function Player() {
			this.healthmax = 50;
			this.health = 50;

			engine.initSprite(this, 'char');
			this.initAnimation(32, 64, 12);

			this.createAnimClip('idle', 0, 1, 2);
			this.createAnimClip('run', 2, 5, 12);
			this.createAnimClip('jump', 6, 6, 1);
			this.createAnimClip('atack', 1, 1, 1);
			this.setAnim('idle');

			this.boundingWidth = 6;
			this.boundingHeight = 32;

			this.weapon = null; //new WeaponOne();

			this.hitPower = 25;

			this.attackState = false;
			this.attackLock = false;

			this.levelPassed = false;
			this.controll = true;

			this.ondeath = function() {
				function DropWeapon(wep) {
					this.wep = wep;
					this.boundingWidth = wep.width;
					this.boundingHeight = wep.height;
					this.onadded = function() {
						this.addChild(this.wep);
					};

					this.onupdate = function(deltaTime) {
						this.mobupdate(deltaTime);
					};
				};
				DropWeapon.prototype = new Mob();

				if (this.weapon != null) {
					var dw = new DropWeapon(this.weapon);
					dw.x = this.x;
					dw.y = this.y;
					this.parent.addChild(dw);
				}

				function GameOver() {
					this.cx = 0;

					this.onupdate = function(deltaTime) {
						if (this.y < engine.canvas.height / 2) {
							this.y += 5;
						}
					};
				};

				GameOver.prototype = engine.getSprite('gameover');

				this.parent.parent.addChild(new GameOver());
			}

			this.giveWeapon = function(weapon) {
				this.weapon = weapon;
				this.addChild(this.weapon);
			};

			function finishAttack(player) {
				player.attackState = false;
				player.weapon.x = 0;
			}

			this.attack = function() {
				if ((!this.attackState) && (!this.attackLock) && (this.weapon != null)) {
					this.weapon.x = this.flipHorizontal ? -20 : 20;
					this.attackState = true;
					this.attackLock = true;

					var map = this.map;

					for (var i = 0; i < map.children.length; i++) {
						if (map.children[i] instanceof Enemy) {
							var enemy = map.children[i];
							if (enemy.health > 0) {
								var v = new Vector(enemy.x - this.x, enemy.y - this.y);
								if (v.length() <= (enemy.boundingWidth + this.boundingWidth) + 30) {
									enemy.health -= this.hitPower;
									var newBleed = new Bleed();
									newBleed.x = enemy.x;
									newBleed.y = enemy.y;
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
				if (this.controll) {
					if (engine.isLeft()) {
						this.moveleft = true;
						this.setAnim('run');
						this.flipHorizontal = true;
						if (this.weapon != null)
							this.weapon.flipHorizontal = true;
					}
					if (engine.isRight()) {
						this.moveright = true;
						this.setAnim('run');
						this.flipHorizontal = false;
						if (this.weapon != null)
							this.weapon.flipHorizontal = false;
					}

					if (engine.isKeysDown([Keyboard.key_z, Keyboard.key_x, Keyboard.key_c, Keyboard.key_ctrl])) {
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

					this.parent.x = engine.canvas.width / 2 - this.x;
					if (this.parent.x > 0) this.parent.x = 0;
					if (this.parent.x + this.parent.width < engine.canvas.width) this.parent.x = -this.parent.width + engine.canvas.width;

					this.parent.y = engine.canvas.height / 2 - this.y;
					if (this.parent.y > 0) this.parent.y = 0;
					if (this.parent.y + this.parent.height < engine.canvas.height) this.parent.y = -this.parent.height + engine.canvas.height;
				}

				if (!this.dead) {
					this.health = aspire(this.health, this.healthmax, 0.005);
				}

				this.mobupdate(deltaTime);
			}
		};
		Player.prototype = new Mob();

		this.player = new Player();

		function HUD(player) {
			this.cx = 0;
			this.cy = 0;

			this.hearts = new Array();

			this.onadded = function() {
				for (var i = 0; i < 5; i++) {
					this.hearts[i] = engine.getSprite('heart');
					this.hearts[i].x = 17 + i * 30;
					this.hearts[i].y = 17;
					this.addChild(this.hearts[i]);
				};
			};

			this.onupdate = function(deltaTime) {
				var val = Math.floor((player.health / player.healthmax) * 5);
				for (var i = 0; i < 5; i++) {
					if (player.dead) {
						this.hearts[i].visible = false;
					} else {
						if (i > val) {
							this.hearts[i].visible = false;
						} else {
							this.hearts[i].visible = true;
						}
					}
				};
			};
		};
		HUD.prototype = new Sprite();

		this.initLevel = function(levelMap) {
			var newMap = null;

			if (levelMap instanceof Map) {
				newMap = levelMap;
			} else {
				newMap = new Map();
				newMap.loadMap(levelMap);
			}

			if (this.currentMap != null) {
				this.currentMap.removeChild(this.player);
				this.removeChild(this.currentMap);
			};

			this.currentMap = newMap;
			this.currentMap.game = this;
			this.currentMap.player = this.player;
			this.player.map = this.currentMap;

			this.player.x = this.currentMap.playerx;
			this.player.y = this.currentMap.playery;
			this.player.controll = true;
			this.player.levelPassed = false;

			this.currentMap.addChild(this.player);

			this.currentMap.alpha = 0;
			this.addChild(this.currentMap);
		};

		this.onadded = function(toengine) {
			this.initLevel(new Level1());
			this.addChild(new HUD(this.player));
		};
	};
	Game.prototype = new Sprite();

	/**
	 * Intro scene
	 */
	function Intro() {
		engine.initSprite(this, 'intro');
		this.cx = 0;
		this.cy = 0;

		this.onupdate = function(deltaTime) {
			if (engine.anykey) {
				engine.setRootSprite(new Game());
			}
		};
	};
	Intro.prototype = new Sprite();

	function start() {
		engine.playSound('music', true);
		engine.clearSyle = palette[0];
		engine.setRootSprite(new Intro());
	};

	engine.loadResources({
		'images': {
			'intro': 'intro.png',
			'tiles': 'maps/tile-palette.png',
			'level1': 'maps/level1.png',
			'level2': 'maps/level2.png',
			'level3': 'maps/level3.png',
			'char': 'char.png',
			'gameover': 'gameover.png',
			'heart': 'heart.png',
			'three': 'mobs/three-enemy.png',
			'seven': 'mobs/seven.png',
			'weapone-one': 'weapon/one.png',
			'blood': 'blood.png',
			'inst-move': 'move-instructions.png',
			'inst-attack': 'attack-instructions.png',
			'dialog': 'dialog.png',
			'strike': 'strike.png',
			'win': 'win.png'
		},
		'sounds': {
			'music': 'music-loop.ogg',
			'jump-low': 'jump-low.ogg',
			'enemy': 'enemy.ogg',
			'floor': 'floor.ogg',
			'god': 'god.ogg',
			'hit': 'hit.ogg',
			'hit2': 'hit2.ogg',
			'get': 'get.ogg',
			'say': 'say.ogg',
			'weapon': 'weapon-appear.ogg'
		}
	}, 'data', function() {
		start();
	});
})();