// graph data store
var graph;

var maxInfluenceValue = 2000;                                                     //change as required
var stepInfluenceValue = 10;
var minInfluenceValue = 1;
var infThresh = 1

var speed = 1500
// svg and sizing
var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

// d3 color scheme
// var color = d3.scaleOrdinal(d3.schemeCategory10);

var color = d3.scaleLinear()
    .domain([0, 3000])
    .range(["lightblue", "steelblue"]);

// Define the div for the tooltip
var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)

// simulation initialization
var simulation = d3.forceSimulation()
  .force("link", d3.forceLink()
    .id(function(d) { return d.id; }))
  .force("charge", d3.forceManyBody()
    .strength(function(d) { return -10;}))
  .force("center", d3.forceCenter(width / 2, height / 2));

// // elements for data join
var g = svg.append("g")//.attr("transform", "translate(" + width/2 + "," + height/2 + ")"),
    link = g.append("g").selectAll(".link"),
    text = g.append("g").attr('class','textLabels').selectAll(".text"),
    node = g.append("g").selectAll(".node")


$( function() {
  $( "#influence-slider" ).slider({
    max: maxInfluenceValue,
    min: minInfluenceValue,
    step: stepInfluenceValue,
    slide: function( event, ui ) {
      infThresh = ui.value;
      update()
    }
  });
} );

// force.stop()
$("#freeze-button")
    .on("click", function(){
      var button = $(this);
      if (button.text() == "Freeze"){
          button.text("Continue")
          simulation.stop();
      }
      else {
          button.text("Freeze")
          update();
      }
  });


$("#country-select")
  .on("change", function(){
    update();
  })

$("#centrality-select")
  .on("change", function(){
    update();
  })

$("#back-button")
    .on("click", function(){
        infThresh-=1;
        update();
    });

$("#forward-button")
    .on("click", function(){
        infThresh+=1;
        update();
    });


// load and save data
// d3.json("final_json_v1.json", function(err, g) {
d3.json("test_file.json", function(err, g) {
  if (err) throw err;
  graph = g;
  var groupOptions = new Object()
  g.nodes.forEach(function(g){
    groupOptions[g.country]=g.country
  });
  const orderedOptions = {};
  Object.keys(groupOptions).sort().forEach(function(key){
    orderedOptions[key] = groupOptions[key];
  })
  getGroups(orderedOptions)
  update()
  // legend()

});


// follow v4 general update pattern
function update() {

  new Array;
  size = $("#centrality-select").val()

  $("#infThresh")[0].innerHTML = infThresh //update the value in the slider (above the slider bar)

  var t = d3.transition()
    .duration(speed);

  //-----FILTER FROM DROPDOWN LIST------------
  filteredValue = $("#country-select").val()
  //get all filtered nodes
  nodes = graph.nodes.filter(function(n){

    if (filteredValue=='all'){
      return true;
    } else {
      return n.country==filteredValue
    }
  }).filter(function(n){
    return n.influence>=infThresh
  });


  nodes.forEach(function(g){g.size = g[size]});


  //get the list of relavent ids
  var nodeList = new Set();
  nodes.forEach(function(n){
    nodeList.add(n.id)
  })

  // Get all links from sliced data
  links = graph.links.filter(function(l){
    if (l.source.id == undefined){
      return nodeList.has(l.source) && nodeList.has(l.target)
    } else {
      return nodeList.has(l.source.id) && nodeList.has(l.target.id);
    }
  });

  //remove unused nodes (nodes not attached to any links)
  distinctLinks = new Set();

  function getSourceTarget(l) {
    if (l.source.id==undefined){
      distinctLinks.add(l.source) && distinctLinks.add(l.target)
    } else {
      distinctLinks.add(l.source.id) && distinctLinks.add(l.target.id)
    }
  }

  links.map(getSourceTarget)
  function filterNodes(v,index){
    if (distinctLinks.has(v.id)){return v}
  }
  nodes = nodes.filter((v, i) => filterNodes(v));

  //-----UPDATE LINKS------------
  link = link.data(links, function(d) {return d.id; });
  // link = link.data(links)

  link.exit().transition(t)
    .attr("stroke-opacity", 0)
    .attrTween("x1", function(d) { return function() { return d.source.x; }; })
    .attrTween("x2", function(d) { return function() { return d.target.x; }; })
    .attrTween("y1", function(d) { return function() { return d.source.y; }; })
    .attrTween("y2", function(d) { return function() { return d.target.y; }; })
    .remove();

  link = link.enter().append("line")
    .attr("stroke-width", "3.5")
    .attr("stroke-width", function(d) {
      return 2
      // return Math.sqrt(d.strength);
    })
    .call(function(link) { link.transition(t)
      .attr("stroke-opacity", 1) })
      .attr("stroke", "#000")
    .merge(link);


  //-----UPDATE NODES------------
  // node = node.selectAll("circle").data(nodes);

  node = node.data(nodes, function(d) { return d.id; });

  node.exit()
    .transition(t)
      .attr("r", 0)
    .remove();

  node = node.enter().append("circle")
      .attr("fill", function(d) {
        return color(d.influence/10);
        })                                               //change to influencer score
      .attr("class","circle-node")
      .style("stroke", "gray")
      .style("stroke-width", .4)
      .attr("r", function(d) {
        return Math.abs(d.size)})
      .call(function(node) { node.transition(t) })
      .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
          )

      .on("mouseover", function(d) {
        div.transition()
            .duration(200)
            .style("opacity", .9)
        data_html = div.html("<strong>Number Influencers:</strong> " + d.influence + "<br/>" +
                 "<strong>Centrality Score:</strong> " + Math.abs(d.size).toFixed(2) + "<br/>" +
                 "<strong>Country:</strong> " + d.country + "<br/>")
            .style("left", (700) + "px")   //increase second number and it goes right
            .style("top", (140) + "px")  //decease to go up
        d3.select(this).attr("r", function(d) {return Math.abs(d.size)*2;})
        })
    .on("mouseout", function(d) {
        div.transition()
            .duration(500)
            .style("opacity", 0)
            d3.select(this).attr("r", function(d) {return Math.abs(d.size); })
    })
    .merge(node);

    node.transition()
    .duration(2000)
      // .attr('fill-opacity', 0.8)
      // .attr("r", function(d) {
      //   return Math.abs(d.size);})

  //-----UPDATE TITLES------------
  // text = text.data(nodes, function(d) {return d.id; });
  //
  // text.exit().transition()
  //   .remove();
  //
  // text = text.enter().append("text")
  //   .attr("font-size", "8px")
  //
  // .text(function(d) {return d.label;})
  // .merge(text);


  //-----RUN THE SIMULATION------------
  simulation.nodes(nodes)
    .on("tick", ticked);

  simulation.force("link")
    .links(links);

  simulation.alphaTarget(0.3).restart();

  $("#freeze-button").text("Freeze")
}
//-----DRAG THE EVENT HANDLERS------------
function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}



// tick event handler (nodes bound to container)
function ticked() {
  node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })

  link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; })

  text.attr("transform",function(d) { return "translate("+d.x+","+(d.y-15)+")"; })


  // Update the date label
  $("#influence-slider").slider("value", + (infThresh))  //slider slides to the right as time goes by!
}

function getGroups(country) {
  var _select = $('<select>');
  $.each(country, function(val, text) {
      _select.append(
              $('<option></option>').val(val).html(text)
          );
  });
  $('#country-select').append(_select.html());
}

//-----ZOOMIES------------
function zoom_actions(){
    transform = d3.event.transform;
    g.attr("transform", d3.event.transform)
}

var zoom_handler = d3.zoom()
    .on("zoom", zoom_actions);
zoom_handler(svg);


var lin = d3.scaleLinear()
    .domain([ 1, 1000 ])
    .range(["lightblue", "steelblue"]);

var svg = d3.select("svg");

svg.append("g")
  .attr("class", "legendLog")
  .attr("transform", "translate(" + (width-150) + "," + (50) +")")

svg.append("text")
  .attr("class","text")
  .attr("x",(width-160))
  .attr("y",40)
  .text("Number of Followers")

var linLegend = d3.legendColor()
    .cells([100, 300, 500, 700, 900])
    .scale(lin)
    .labelFormat("d")

svg.select(".legendLog")
  .call(linLegend);
