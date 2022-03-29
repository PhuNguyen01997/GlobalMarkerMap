export default class GlobalMapMarker {
  _worldMapStructure;
  _worldMapRatio;
  _currentWidth;
  _currentHeight;
  _scale;
  _markerSize;
  _projection;
  _selection;
  _container;
  _gViewBox;
  _svgViewBox;

  constructor(obj) {
    this.options = {
      width: null,
      maxWidth: 1920,
      scale: null,
      breakpoint: 480,
      markerSize: null,
      translateSP: {
        x: 0,
        y: 0
      }
    }

    Object.keys(obj).forEach(key => {
      this.options[key] = obj[key];
    })

    this._setup();
  }

  init(selection) {
    this._selection = selection
    this._container = $(this._selection);
    this._htmlData = this._container.find('.gmm-item').toArray().reduce((arr, element, index) => {
      const latitude = $(element).attr('latitude');
      const longitude = $(element).attr('longitude');
      const x = this._projection([longitude, latitude])[0];
      const y = this._projection([longitude, latitude])[1];

      let marker = $(element).find('.gmm-marker');
      let markerChildren = marker.children();
      markerChildren.attr("cx", x)
      markerChildren.attr("cy", y)

      let pagiItem = $(`${this._selection} .gmm-pagination .gmm-pagination-item`)[index];
      $(pagiItem).attr('data-id', index);

      const item = {
        id: index,
        latitude,
        longitude,
        x,
        y,
        popup: $(element).find('.gmm-popup-item')[0],
        marker: marker[0],
        pagiItem: pagiItem[0],
      }
      arr.push(item);

      return arr;
    }, []);

    this._initBgPattern();
    this._initGlobalMap();
    this._initMarker();
    this._initPopup();
    this._initPaginationOnSP();

    this._container.children('.gmm-list').remove();
  }

  getWidth() {
    return this._currentWidth;
  }

  getHeight() {
    return this._currentHeight;
  }

  _setup() {
    this._worldMapStructure = JSON.parse(map_structure);
    this._worldMapRatio = 1.546;
    this._currentWidth = this.options.width > this.options.maxWidth ? this.options.maxWidth : this.options.width;
    this._currentHeight = this._currentWidth / this._worldMapRatio;
    this._scale = this._isOnSP() ? this.options.scaleSP : 1;
    this._markerSize = this._currentWidth * (this._isOnSP() ? this.options.markerSize * this._scale : this.options.markerSize)
    this._projection = d3.geoMercator().fitSize([this._currentWidth, this._currentHeight], this._worldMapStructure);
  }

  _getFitHeight(width) {
    return width * this.scale;
  }

  _isOnSP() {
    return this.options.width <= this.options.breakpoint;
  }

  _convertDOMToString(htmlNode) {
    let result = '';
    if (Object.prototype.toString.call(htmlNode) === '[object Array]') {
      htmlNode.forEach(node => {
        result += node.outerHTML;
      })
    } else {
      result = htmlNode.outerHTML;
    }
    return result;
  }

  _initBgPattern() {
    this._svgViewBox = d3.select(this._selection).append('svg')
      .attr("width", this._currentWidth)
      .attr("height", this._currentHeight)
      .attr("class", "gmm-svg")

    this._svgViewBox.append('defs')
      .append('pattern')
      .attr('id', 'backgroundMap')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr("width", this._currentWidth)
      .attr("height", this._currentHeight)
      .append('image')
      .attr('href', "/img/map-background.jpg")
      .attr('preserveAspectRatio', 'none')
      .attr("width", this._currentWidth)
      .attr("height", this._currentHeight)

    this._gViewBox = this._svgViewBox.append("g")
      .attr('class', 'gmm-g-custom')
      .attr('transform', `matrix(${this._scale}, 0, 0, ${this._scale}, 0, 0)`)
  }

  _initGlobalMap() {
    this._gViewBox.selectAll("path")
      .data(this._worldMapStructure.features)
      .enter()
      .append("path")
      .attr("fill", "url(#backgroundMap)")
      .attr("d", d3.geoPath()
        .projection(this._projection)
      )
      .style("stroke", "none")
      .style("stroke-width", "20")
      .style("opacity", .5)

    const firstPath = $('.gmm-g-custom path')[0];
    let fullAllPathStr = ''
    $('.gmm-g-custom path').each((index, path) => {
      if (index !== 0) {
        fullAllPathStr += ' ';
      }
      fullAllPathStr += path.getAttribute('d');
    })
    firstPath.setAttribute('d', fullAllPathStr);

    this._gViewBox.selectAll("*").remove();

    $('.gmm-g-custom').append(firstPath);
  }

  _initMarker() {
    this._htmlData.forEach(element => {
      const markerChildren = $(element.marker).children().toArray();
      const classList = element.marker.classList.value;

      const gMarker = this._gViewBox
        .append('g')
        .attr('class', classList)
        .attr('data-id', element.id)
        .html(this._convertDOMToString(markerChildren));
    })
  }

  _initPopup() {
    this._container.prepend('<div class="gmm-popup"></div>');
    const popupContainer = $('.gmm-popup');
    this._htmlData.forEach(item => {
      const popup = item.popup;
      const eleCenter = $(`.gmm-g-custom .gmm-marker[data-id="${item.id}"] > *`)[0];

      let position;
      if (this._isOnSP()) {
        position = {
          x: (this._container.width() - $(popup).outerWidth()) / 2,
          y: (this._container.height() - $(popup).outerHeight()) / 2,
        }
      } else {
        position = {
          x: $(eleCenter).offset().left + parseFloat($(eleCenter).attr("r")) - $(popup).outerWidth() / 2,
          y: $(eleCenter).offset().top + parseFloat($(eleCenter).attr("r")) - $(popup).outerHeight() / 2,
        }
      }
      $(popup).css({
        left: position.x,
        top: position.y,
      })

      $(popup).attr('data-id', item.id);

      popupContainer.append(popup);
    })
  }

  _initPaginationOnSP() {
    const instance = this;
    let isProcess = false;
    this._container.on('click', '.gmm-pagination-item', function() {
      if (isProcess || this.classList.contains('active')) return;

      isProcess = true;
      $('.gmm-pagination-item').removeClass('active');
      this.classList.add('active');

      const id = this.dataset.id;
      const data = instance._htmlData.filter(d => d.id === parseInt(id))[0];
      const newTranslate = {
        x: -(data.x * instance._scale - instance._currentWidth / 2) + instance.options.translateSP.x,
        y: -(data.y * instance._scale - instance._currentHeight / 2) + instance.options.translateSP.y,
      };

      const currentTransalte = new WebKitCSSMatrix(instance._gViewBox.attr('transform'));

      const timeTransition = 800;
      const times = timeTransition / 10;
      const distance = {
        x: (newTranslate.x - currentTransalte.e) / times,
        y: (newTranslate.y - currentTransalte.f) / times
      }

      $(`.gmm-popup-item`).add('.gmm-marker').removeClass('active');

      let count = 1;
      const translateInterval = setInterval(() => {
        instance._gViewBox.attr('transform', `matrix(${instance._scale}, 0, 0, ${instance._scale}, ${currentTransalte.e + distance.x * count}, ${currentTransalte.f + distance.y * count})`);
        if (++count > times) {
          clearInterval(translateInterval);
          $(`.gmm-popup-item[data-id="${id}"]`).add(`.gmm-marker[data-id="${id}"]`).addClass('active');
          isProcess = false;
        };
      }, 10)
    })

    if (instance._isOnSP()) {
      setTimeout(() => {
        $('.gmm-pagination').children('*')[0].click();
      }, 500)
    }
  }
}