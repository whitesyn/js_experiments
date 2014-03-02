(function (w) {
	'use strict';

	var ImagesLayout = function (images, onComplete) {
		var that = this;

		that.images         = images;
		that.onComplete     = onComplete;

		that.image          = null;
		that.imageCounter   = 0;
		that.imageParams    = null;
		that.previousImageParams = null;

		that.cells          = [ ['#', '#', '#', '#'], ['#', '#', '#', '#'] ];
		that.rowsCount      = 0;
		that.currentX       = 0;
		that.currentY       = 0;

		that.preloadImages();
	};

	ImagesLayout.prototype = {
		CELL_SIZE: 100,

		hasEmptyCells: function () {
			var cells = this.cells;
			return ~(cells[0].join('') + cells[1].join('')).indexOf('#');
		},

		isRowFull: function () {
			var cells = this.cells;
			return (!~cells[0].join('').indexOf('#') && cells[1].join('') === '####');
		},

		resetCells: function () {
			var that = this;

			that.cells = [ ['#', '#', '#', '#'], ['#', '#', '#', '#'] ];

			that.currentX = 0;
			that.currentY = 0;
			that.rowsCount += 2;
		},

		showImage: function (fillX, fillY) {
			var that    = this,
				cells   = that.cells,
				size    = that.CELL_SIZE,
				x       = that.currentX,
				y       = that.currentY;

			that.image.width = fillX * size;
			that.image.height = fillY * size;
			that.image.left = x * size;
			that.image.top = (that.rowsCount * size) + (y * size);

			for (var i = y; i < y + fillY; ++i) {
				for (var j = x; j < x + fillX; ++j) {
					cells[i][j] = that.imageCounter;
				}
			}

			if (!that.hasEmptyCells()) {
				that.resetCells();
				that.previousImageParams = null;
			} else if (that.isRowFull()) {
				that.resetCells();
				that.rowsCount -= 1;
				that.previousImageParams = null;
			} else {

				that.previousImageParams = {
					width: that.imageParams.width,
					height: that.imageParams.height,
					isSmall: that.imageParams.isSmall,
					isLandscape: that.imageParams.isLandscape,
					isPortrait: that.imageParams.isPortrait,
					isNormal: that.imageParams.isNormal
				};

				x = j;

				// if row was filled
				if (x >= cells[y].length) {
					++y;
					x = cells[y].join('').indexOf('#');

					if (x === 0) {
						that.previousImageParams = null;
					}
				}

				that.currentX = x;
				that.currentY = y;

				that.cells = cells;
			}

		},

		fitLandscapeImage: function () {
			var that            = this,
				cells           = that.cells,
				x               = that.currentX,
				y               = that.currentY,
				cellsAvailable  = cells[0].length - that.currentX,
				couldFillCells  = (that.imageParams.width / that.CELL_SIZE) | 0,
				fillX           = Math.min(cellsAvailable, couldFillCells),
				fillY           = 1;

			if (cells[y + 1] && cells[y + 1][x - 1] !== '#' && that.imageParams.height > that.CELL_SIZE * 2) {
				fillY = 2;
			}

			if (fillX > 1) {
				if (fillX !== fillY) {
					that.imageParams.isLandscape = true;
					that.imageParams.isNormal = false;
					that.imageParams.isPortrait = false;
				}
			}

			that.showImage(fillX, fillY);
		},

		fitPortraitImage: function () {
			var that = this,
				cells = that.cells,
				x = that.currentX,
				y = that.currentY,
				fillX = 1,
				fillY = 1;

			// if next row available and cell from the left in the next row was filled before
			if (cells[y + 1] && cells[y + 1][x] === '#' && (cells[y + 1][x - 1] !== '#')) {
				fillY = 2;
			}

			that.showImage(fillX, fillY);
		},

		fitNormalImage: function () {
			var that = this,
				cells = that.cells,
				x = that.currentX,
				y = that.currentY;

			if (cells[y + 1] && cells[y + 1][x] === '#') {
				if (!cells[y][x - 1] && cells[y + 1][x - 1] && that.images.length) {
					that.showImage(2, 2);
				}
				else if (cells[y + 1][x + 1] !== '#' && cells[y][x + 1] !== '#') {
					that.fitPortraitImage();
				}
				else {
					that.fitLandscapeImage();
				}
			} else {
				that.showImage(1, 1)
			}
		},

		getImageProperties: function () {
			var that = this,
				cellSize = that.CELL_SIZE,
				properties = {
					width: +that.image.width,
					height: +that.image.height
				};

			properties.isSmall = properties.width < cellSize * 2 && properties.height < cellSize * 2;

			if (properties.isSmall) {
				properties.isLandscape = false;
				properties.isPortrait = false;
			} else {
				properties.isLandscape = properties.width >= cellSize * 2 && properties.width > properties.height * 1.5;
				properties.isPortrait = properties.height >= cellSize * 2 && properties.width < properties.height * 1.5;
			}

			properties.isNormal = !properties.isLandscape && !properties.isPortrait;

			return properties;
		},

		preloadImages: function () {
			var that = this,
				imagesArray = [],
				hash = {},
				i = 0,
				image;

			for (; (image = that.images[i]); ++i) {
				imagesArray.push(image.src);
				hash[image.src] = i;
			}

			var preLoader = new w.preLoader(imagesArray, {
				onProgress: function(img, imageEl) {
					var idx = hash[img];
					if (imageEl) {
						that.images[idx].width = imageEl.width;
						that.images[idx].height = imageEl.height;
					}
				},
				onComplete: function(loaded, errors){
					that.run();
				}
			});
		},

		run: function () {
			var that    = this,
				images  = that.images,
				i       = 0,
				image, previousParams;

			for (; (image = images[i]); ++i) {
				that.imageCounter   = i;
				that.image          = image;
				that.imageParams    = that.getImageProperties();
				previousParams      = that.previousImageParams;

				if (that.imageParams.isSmall) {
					that.showImage(1, 1);
				}
				else {
					if (!previousParams || (!previousParams.isSmall && !previousParams.isLandscape)) {
						if (that.imageParams.isLandscape) {
							that.fitLandscapeImage();
						}
						if (that.imageParams.isPortrait) {
							that.fitPortraitImage();
						}
						else if (that.imageParams.isNormal) {
							that.fitNormalImage();
						}
					} else {
						// portrait image will be cropped to 1x1 cell
						if (that.imageParams.isPortrait) {
							that.showImage(1, 1);
						}
						// try to fit landscape or normal image as landscape
						else {
							that.fitLandscapeImage();
						}
					}
				}
			}

			that.cut();

			that.onComplete && that.onComplete(images, that.rowsCount);
		},

		cut: function () {
			var that            = this,
				cells           = that.cells,
				needCut         = false,
				i               = 0,
				hasPortraits    = false,
				previousImageNum = null,
				imageNum;

			if (that.hasEmptyCells()) {
				for (; (imageNum = cells[0][i]); ++i) {
					if (imageNum !== '#' && cells[1][i] === imageNum) {
						hasPortraits = true;
					}

					if (imageNum !== '#' && cells[1][i] !== '#' && cells[1][i] !== imageNum) {
						break;
					}

					if (hasPortraits && imageNum !== '#' && cells[1][i] === '#') {
						needCut = true;
						break;
					}
				}
			}

			if (needCut) {
				--that.rowsCount;
				for (i = 0; (imageNum = cells[0][i]); ++i) {
					if (imageNum !== '#' && imageNum !== previousImageNum) {
						that.images[imageNum - 1].height = that.CELL_SIZE;
						previousImageNum = imageNum;
					}
				}
			}
		}
	};

	w.ImagesLayout = ImagesLayout;

})(window);

