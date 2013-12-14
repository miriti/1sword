(function() {
	var palette = ['#09121a', '#112533', '#1a374d', '#234966', '#2b5c80', '#346e99', '#3d80b3', '#4593cc'];

	var engine = new Engine("render");
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

				this.realWidth = imageData.width;
				this.realHeight = imageData.height;

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
				this.width = imageData.width * 32;
				this.height = imageData.height * 32;
				this.cx = this.cy = 0;
			};

			this.onupdate = function(deltaTime) {

			};
		};
		Map.prototype = engine.getSprite('map');

		function CollisionObject() {
			this.collision = function() {
				if ((this.parent != null) && (this.parent instanceof Map)) {
					var map = this.parent;

					if (this.map != null) {
						if (this.x - map.width / 2 < 0) {
							this.x = map.width / 2;
						}
						var mapData = map.mapData;
						var cellX = Math.floor(this.x / 32);
						var cellY = Math.floor(this.y / 32);
					}
				}
			}
		};
		CollisionObject.prototype = new Sprite();

		function Player() {

			engine.initSprite(this, 'char');
			this.initAnimation(32, 64, 12);

			this.x = 100;
			this.y = 70;

			this.onupdate = function(deltaTime) {
				if (engine.isLeft()) {
					this.x -= 3;
				}

				if (engine.isRight()) {
					this.x += 3;
				}

				if (engine.isUp()) {
					this.y -= 3;
				}

				if (engine.isDown()) {
					this.y += 3;
				}

				this.collision();
			}
		};
		Player.prototype = new CollisionObject();

		var map = new Map();
		map.addChild(new Player());

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
			'char': 'char.png'
		},
		'sounds': {

		}
	}, 'data', function() {
		start();
	});
})();