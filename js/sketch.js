let svgCount = 0;

let titleText;
let textCol = "black";
let textSize = 20;
let textHeight = 20;
let textX = 50;
let textY = 50;
let lineWidth = 1;

let bottomMargin = 100;
let width;
let height;
let margin = parseFloat(
  getComputedStyle(document.documentElement).getPropertyValue("--margin")
);

let timeLimit;
let printed = false;

let veronoiGroup, starGroup, uiGroup;
let rangeRect;

let data;
let zDepth;
let zStart;
let zEnd;
let area;
let colourVal;
let forwards = true;
let speed = 0.001;
let animating = false;
let galaxyPositions = false;

let stroke = "#333333";
let circle = "white";
let circleSize = 2;
let starFontsize = 5;

// get data from galaxies
// http://voyages.sdss.org/launch/milky-way/sdss-constellations/discovering-constellations-using-sdss-plates/

// Make the paper scope global, by injecting it into window:
paper.install(window);
window.onload = function () {
  // Setup directly from canvas id:
  paper.setup("myCanvas");

  const zSlider = document.querySelector("#slider");
  const depthSlider = document.querySelector("#depth");
  const areaSlider = document.querySelector("#area");
  const startNumber = document.querySelector("#start-number");
  const depthNumber = document.querySelector("#depth-number");
  const areaNumber = document.querySelector("#area-number");
  const colourRangeSlider = document.querySelector("#colour-range");
  const colourRangeNumber = document.querySelector("#colour-range-number");

  zStart = Number(localStorage.getItem("zStart")) || Number(zSlider.value);
  zDepth = Number(localStorage.getItem("zDepth")) || Number(depthSlider.value);
  area = Number(localStorage.getItem("area")) || Number(areaSlider.value);
  colourVal =
    Number(localStorage.getItem("colourVal")) ||
    Number(colourRangeSlider.value);
  console.log(zStart, zDepth, colourVal, area);

  // set the values
  zSlider.value = startNumber.value = zStart;
  depthSlider.value = depthNumber.value = zDepth;
  areaSlider.value = areaNumber.value = area;
  colourRangeSlider.value = colourRangeNumber.value = colourVal;

  zSlider.addEventListener("input", (event) => {
    redShiftEvent(event);
  });

  depthSlider.addEventListener("input", (event) => {
    depthEvent(event);
  });

  startNumber.addEventListener("input", (event) => {
    redShiftEvent(event);
  });

  depthNumber.addEventListener("input", (event) => {
    depthEvent(event);
  });

  areaSlider.addEventListener("input", (event) => {
    areaEvent(event);
  });

  colourRangeSlider.addEventListener("input", (event) => {
    colourEvent(event);
  });

  const animationControl = document.querySelector("#animation");
  const galaxyPositionsControl = document.querySelector("#galaxy-positions");
  animationControl.addEventListener("click", (event) => {
    animating = !animating;

    animating
      ? (event.target.textContent = "Stop animation")
      : (event.target.textContent = "Start animation");
  });

  galaxyPositionsControl.addEventListener("click", (event) => {
    galaxyPositions = !galaxyPositions;

    galaxyPositions
      ? (event.target.textContent = "Galaxy Positions on")
      : (event.target.textContent = "Galaxy Positions off");
  });

  depthSlider.value = zDepth;

  function redShiftEvent(event) {
    const eVal = event.target.value;
    zStart = Number(eVal);
    startNumber.value = eVal;
    localStorage.setItem("zStart", zStart);

    animating = false;
  }

  function depthEvent(event) {
    const eVal = event.target.value;
    zDepth = Number(eVal);
    depthNumber.value = eVal;
    localStorage.setItem("zDepth", zDepth);
    animating = false;
  }

  function areaEvent(event) {
    const eVal = event.target.value;
    area = Number(eVal);
    areaNumber.value = eVal;
    localStorage.setItem("area", area);
    animating = false;
  }

  function colourEvent(event) {
    const eVal = event.target.value;
    colourVal = Number(eVal);
    colourRangeNumber.value = eVal;
    localStorage.setItem("colourVal", colourVal);
    animating = false;
  }

  // timelimit
  // timeLimit = Math.random() * 20 + 20;
  timeLimit = 1;

  width = paper.view.size.width;
  height = paper.view.size.height;

  // rangeRect = new Path.Rectangle({
  //   x: margin,
  //   y: 1,
  //   width: width - margin * 2,
  //   height: 10,
  //   strokeColor: "transparent",
  //   strokeWidth: 1,
  //   fillColor: "red",
  // });

  veronoiGroup = new Group();
  veronoiGroup.position = view.center;
  starGroup = new Group();
  starGroup.addChild(rangeRect);

  ///////////////////////
  // VERONOI FUNCTIONS //
  ///////////////////////

  let voronoi = new Voronoi();
  let sites, diagram;
  let bbox;
  let oldSize = paper.view.size;
  let strokeColor = new Color(stroke);
  let circleColor = new Color(circle);
  let fillColor = new Color("black");

  let mousePos = view.center;
  let selected = false;

  // get the data

  const parser = Papa.parse("data/10475/results-pos.csv", {
    download: true,
    header: true,
    skipEmptyLines: "greedy",
    complete: function (results, file) {
      // all x
      // const xes = data.map((d) => d.x);
      // const yes = data.map((d) => d.y);
      // console.log("xes", Math.max(...xes));

      data = results.data;
      gotData();
    },
  });

  function gotData() {
    bbox = {
      xl: margin,
      xr: width - margin,
      yt: margin,
      yb: height - margin,
    };
    sites = generatePoints(data);

    // for (let i = 0, l = sites.length; i < l; i++) {
    //   sites[i] = sites[i].multiply(view.size).divide(oldSize);
    // }
    // oldSize = view.size;
    renderDiagram();
    // sites.forEach((site) => makeStar(site));
  }

  function generatePoints(points) {
    let sites = points.reduce((acc, curr) => {
      // new Point(Math.floor(Math.abs(point.x)), Math.floor(Math.abs(point.y)))

      //remove stars

      if (curr.class !== "STAR" && zRange(curr.z)) {
        acc.push(
          new Point(
            Math.floor(mapRange(curr.x, -360, 360, 0, width)),
            Math.floor(mapRange(curr.y, -360, 360, 0, height))
          )
        );
      }
      return acc;
    }, []);
    // console.log("sites", sites);
    return sites;
  }

  function zRange(z) {
    if (z >= zStart - zDepth / 2 && z < zStart + zDepth / 2) {
      return true;
    } else {
      return false;
    }
  }

  function renderDiagram() {
    veronoiGroup.children = [];
    starGroup.children = [];
    let diagram = voronoi.compute(sites, bbox);
    if (diagram) {
      for (let i = 0; i < sites.length; i++) {
        let cell = diagram.cells[sites[i].voronoiId];
        let make = true;
        if (cell) {
          let halfedges = cell.halfedges,
            length = halfedges.length;
          if (length > 2) {
            let points = [];
            for (let j = 0; j < length; j++) {
              v = halfedges[j].getEndpoint();

              const shift = 0;
              if (
                v.x <= bbox.xl + shift ||
                v.x >= bbox.xr - shift ||
                v.y <= bbox.yt + shift ||
                v.y >= bbox.yb - shift
              ) {
                make = false;
              }
              points.push(new Point(v));
            }
            // if (
            //   (point.x !== bbox.xl &&
            //     point.x !== bbox.xr &&
            //     point.y !== bbox.yt &&
            //     point.y !== bbox.yb) ||
            //   all === true
            // )
            if (make) {
              const cellPath = createPath(points, sites[i]);
              veronoiGroup.addChild(cellPath);
              const rootArea = Math.sqrt(cellPath.bounds.area);

              let grey = mapRange(rootArea, 0, colourVal, 0, 1);
              cellPath.fillColor = new Color(
                1 - grey * 2,
                1 - grey * 5,
                1 - grey
              );
              if (rootArea > area) {
                cellPath.visible = false;
              } else {
                makeStar(sites[i], i);
              }
            }
          }
        }
      }
    }
  }

  function createPath(points, center) {
    let path = new Path();
    if (!selected) {
      path.strokeColor = strokeColor;
      path.fillColor = "red";
    } else {
      path.fullySelected = selected;
    }
    path.closed = true;

    for (let i = 0, l = points.length; i < l; i++) {
      let point = points[i];
      let next = points[i + 1 == points.length ? 0 : i + 1];
      let vector = next.subtract(point).divide(2);

      path.add({
        point: point.add(vector),
        point: point,
        handleIn: -vector,
        handleOut: vector,
      });
    }
    // path.scale(0.95);
    // removeSmallBits(path);
    return path;
  }

  function makeStar(point, i) {
    let path = new Path.Circle({
      center: [point.x, point.y],
      radius: circleSize,
      fillColor: circleColor,
      parent: starGroup,
      // selected: true,
    });

    if (galaxyPositions) {
      let starText = new PointText(
        new Point(point.x + circleSize * 2, point.y + starFontsize / 2.4)
      );
      starText.fontFamily = "sans-serif";
      starText.justification = "left";
      starText.fontSize = starFontsize;
      starText.fillColor = circleColor;
      starText.parent = starGroup;
      starText.content =
        Number(data[i].rag).toFixed(3) +
        " / " +
        Number(data[i].decg).toFixed(3);
    }

    // console.log(point);
  }

  paper.view.onMouseMove = function (event) {};

  paper.view.onFrame = function (event) {
    if (animating) {
      // zStartText.textContent = zStart.toFixed(3);
      if (forwards) {
        zStart += speed;
      } else {
        zStart -= speed;
      }
      if (zStart > 1.5) {
        forwards = false;
      } else if (zStart < 0) {
        forwards = true;
      }
      slider.value = zStart;
    }
    if (data) {
      gotData();
    }
  };

  paper.view.onResize = function (resizeAmount) {
    width = paper.view.size.width;
    height = paper.view.size.height;
    gotData();
  };

  /////////////////////
  // PRINT FUNCTIONS //
  /////////////////////

  // start of printing/svg functions
  function downloadAsSVG(fileName) {
    let date = Date.now();
    // console.log(date);
    if (!fileName) {
      fileName = `darkmatter-redShift-${zStart}-sliceDepth-${zDepth}-area-${area}.svg`;
    }

    let url =
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        paper.project.exportSVG({ bounds: "view", asString: true })
      );

    let link = document.createElement("a");
    link.download = fileName;
    link.href = url;
    link.click();
  }

  t = new Tool();

  //Listen for SHIFT-P to save content as SVG file.
  t.onKeyUp = function (event) {
    if (event.character == "s") {
      print();
    }
  };

  function print() {
    // pendulumLayer.remove(); // this prevents the redCircle from being drawn
    // path.smooth();
    downloadAsSVG();
  }

  // now draw
  paper.view.draw();
};
// end of printing/svg functions

function titles() {
  textX = 50;
  textY = paper.view.size.height - 50;

  titleText = new PointText(new Point(textX, textY));
  titleText.fontFamily = "IBM Plex Mono";
  titleText.justification = "left";
  titleText.fontSize = 12;

  titleText.fillColor = textCol;
  titleText.content = "rain";
}

// Helper functions for radians and degrees.
Math.radians = function (degrees) {
  return (degrees * Math.PI) / 180;
};

Math.degrees = function (radians) {
  return (radians * 180) / Math.PI;
};

// linearly maps value from the range (a..b) to (c..d)
function mapRange(value, a, b, c, d) {
  // first map value from (a..b) to (0..1)
  value = (value - a) / (b - a);
  // then map it from (0..1) to (c..d) and return it
  return c + value * (d - c);
}
