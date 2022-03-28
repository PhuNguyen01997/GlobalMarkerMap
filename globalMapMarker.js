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
      data: [{
          id: 1,
          homelat: -12.25,
          homelon: -59.65,
          title: 'Brazil',
          n: 3000,
          color: '#7563ff'
        },
        {
          id: 2,
          homelat: 15.40,
          homelon: 105,
          title: 'VietNam',
          n: 3000,
          color: '#7563ff'
        },
        {
          id: 3,
          homelat: -25.46,
          homelon: 132.30,
          title: 'Australia',
          n: 3000,
          color: '#7563ff'
        }
      ]
    }

    Object.keys(obj).forEach(key => {
      this.options[key] = obj[key];
    })

    this._setup();
  }

  init(selection) {
    this._selection = selection
    this._container = $(this._selection);

    this._initBgPattern();
    this._initGlobalMap();
    this._initMarker();
    this._initPaginationOnSP();
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

  _initBgPattern() {
    this._svgViewBox = d3.select(this._selection).append('svg')
      .attr("width", this._currentWidth)
      .attr("height", this._currentHeight)

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
      .attr('class', 'mapCustom')
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

    const firstPath = $('.mapCustom path')[0];
    let fullAllPathStr = ''
    $('.mapCustom path').each((index, path) => {
      if (index !== 0) {
        fullAllPathStr += ' ';
      }
      fullAllPathStr += path.getAttribute('d');
    })
    firstPath.setAttribute('d', fullAllPathStr);

    this._gViewBox.selectAll("*").remove();

    $('.mapCustom').append(firstPath);
  }

  _initMarker() {
    const marker = this._gViewBox.selectAll('*')
      .data(this.options.data)
      .enter()
      .append('g')
      .attr('class', 'marker')
      .attr('data-id', (d, index) => index)

    marker.append("circle")
      .attr('class', 'centerCircle')
      .attr("cx", d => this._projection([+d.homelon, +d.homelat])[0])
      .attr("cy", d => this._projection([+d.homelon, +d.homelat])[1])
      .attr("r", this._markerSize)
      .attr("fill", d => d.color)

    marker.append("circle")
      .attr('class', 'hoverCircle')
      .attr("cx", d => this._projection([+d.homelon, +d.homelat])[0])
      .attr("cy", d => this._projection([+d.homelon, +d.homelat])[1])
      .attr("stroke", d => d.color)
      .attr("stroke-width", 1)
      .attr("r", this._markerSize + 5)
      .attr("fill", d => d.color)
      .attr('fill-opacity', .2)

    $('.marker').each((index, circle) => {
      const id = circle.dataset.id;
      let pos = {};
      if (this._isOnSP()) {
        pos = {
          x: this._currentWidth / 2,
          y: this._currentHeight / 2 - this._markerSize * this._scale
        };
      } else {
        pos = {
          x: $(circle).offset().left + this._markerSize,
          y: $(circle).offset().top + this._markerSize - 30,
        }
      }
      let html = ``;
      html += `<div class="popup" data-id="${id}">`;
      html += `<p>Lorem Ipsum</p>`;
      html += `<p>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</p>`;
      html += `</div>`;
      $('.map').append(html);
      const spanNode = $('.map').find(`.popup[data-id="${id}"]`);
      spanNode.css({
        top: pos.y,
        left: pos.x,
      });
    });

    $(this._selection).on('mouseenter', '.marker', function() {
      const id = $(this).attr('data-id');
      $(`.popup[data-id="${id}"]`).addClass('active');
      this.classList.add('active');
    })

    $(this._selection).on('mouseleave', '.marker', function() {
      const id = $(this).attr('data-id');
      $(`.popup[data-id="${id}"]`).removeClass('active');
      this.classList.remove('active');
    })
  }

  _initPaginationOnSP() {
    $(this._selection).append(`<ul class="pagi"></ul>`)
    const pagiQuery = $(`${this._selection} > .pagi`);

    pagiQuery.html($('.marker').toArray().map(marker => `<li class="pagi-item" data-id=${marker.dataset.id}></li>`));

    const instance = this;
    pagiQuery.on('click', '.pagi-item', function() {
      const id = this.dataset.id;
      const marker = $(`.marker[data-id="${id}"]`);
      const circle = marker.find('.centerCircle')[0];
      const lat = $(circle).attr('cx');
      const lon = $(circle).attr('cy');
      const newTranslate = {
        x: -(lat * instance._scale - instance._currentWidth / 2),
        y: -(lon * instance._scale - instance._currentHeight / 2 - (instance._currentHeight * 0.25)),
      };
      const currentTransalte = new WebKitCSSMatrix(instance._gViewBox.attr('transform'));

      const timeTransition = 800;
      const times = timeTransition / 10;
      const distance = {
        x: (newTranslate.x - currentTransalte.e) / times,
        y: (newTranslate.y - currentTransalte.f) / times
      }

      $(`.popup`).add('.marker').removeClass('active');

      let count = 1;
      const translateInterval = setInterval(() => {
        instance._gViewBox.attr('transform', `matrix(${instance._scale}, 0, 0, ${instance._scale}, ${currentTransalte.e + distance.x * count}, ${currentTransalte.f + distance.y * count})`);
        if (++count > times) {
          clearInterval(translateInterval);
          $(`.popup[data-id="${id}"]`).add(marker).addClass('active');
        };
      }, 10)
    })

    if (instance._isOnSP()) {
      setTimeout(() => {
        pagiQuery.find('*')[0].click();
      }, 500)
    }
  }
}