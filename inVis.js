function InVis()
{
	return this;

};

InVis.prototype = function()
{
	var create = function(visSettings, data)
	{
		this.data = data;
		this.visSettings = visSettings;
		this.setupSvgElement(visSettings);
		this.buildForce(visSettings,data);
		this.isZoomAndPanDisabled = false;
		this.disableZoomAndPan = function(state){
			this.isZoomAndPanDisabled = state;
			d3.behavior.zoom.isDisabled = state;
		};
	};

	var zoomed = function () {
		if(!this.isZoomAndPanDisabled)
		{
			this.visSettings.svgElement.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
		}
	}

	var setupSvgElement = function(visSettings)
	{
		var zoom = d3.behavior.zoom()
					.scaleExtent([-100, 100])
					.relativeElement(visSettings.svgElement[0][0])
					.on("zoom", zoomed.bind(this));

		var background = visSettings.svgElement.append("rect")
											   .attr({width: 1000000,
													  height:1000000,
													  fill:'rgb(14, 116, 175)'});
		background.call(zoom);

		visSettings.svgElement = visSettings.svgElement.append('g');




		visSettings.svgElement.call(zoom);

		//Create SVG element
		// visSettings.svgElement
		  // .attr("width", visSettings.svgWidth)
		  // .attr("height", visSettings.svgHeight);

		   $(window).on('resize',function(){
		//   zoom.center([visSettings.svgElement[0][0].getBoundingClientRect().width / 2,
		//							  visSettings.svgElement[0][0].getBoundingClientRect().height / 2]);

			// aspect = $(visSettings.svgElement[0][0]).width() / $(visSettings.svgElement[0][0]).height();
			// var targetWidth = $(visSettings.svgElement[0][0]).parent().width();
			 // visSettings.svgElement.attr("width", targetWidth);
			 // visSettings.svgElement.attr("height", Math.round(targetWidth / aspect));

			 // visSettings.svgWidth = targetWidth;
			 // visSettings.svgHeight = targetWidth / aspect;
		   }).trigger("resize");
	};

	var buildForce = function(visSettings,dataset)
	{
		var me = this;

		visSettings.svgElement
		    	   .on('mouseup',function(){this.disableZoomAndPan(false);}.bind(this))

		this.force = d3.layout.force()
						.nodes(dataset.nodes)
						.links(dataset.edges)
						.size([visSettings.svgWidth, visSettings.svgHeight])
						.linkDistance(visSettings.forceSettings.linkDistance)
						.linkStrength(1)
						.charge([visSettings.forceSettings.charge])
						.start();

		var colors = d3.scale.category10();

		this.updateGraph(visSettings,dataset);

		this.force.on('tick',this.forceTick.bind(this));
	};

	var updateGraph = function(visSettings,dataset){
		var me = this;

		this.data = dataset;

		this.force.nodes(dataset.nodes)
				  .links(dataset.edges)
				  .start()
				  .alpha(.1);

		this.nodes = visSettings.svgElement.selectAll(".cardNode")
			.data(dataset.nodes,function(d){return d.name;});
		this.nodes.enter()
			.append("foreignObject")
			.attr('class','cardNode')
			.on('mousedown',function(){this.disableZoomAndPan(true);}.bind(this))
			.html(function(d,i){
				return me.visSettings.nodeSettings.buildNode(d,i);
			})
			.attr({width:'226px',
				   height:'100%', x: 10, y:10})
			.call(this.force.drag);

		this.nodes
			.exit()
			.remove();

		Enumerable.From(this.nodes[0]).ForEach(
			function(d,i){
				if (d) {
					d.__data__.foHeight = $(d).contents().height();
					d.__data__.foWidth = $(d).contents().width();
				}
			}
		);


			//Create edges as lines
		this.edges = visSettings.svgElement.selectAll("path")
			.data(dataset.edges,function(d){return d.source.name + d.target.name;});
		this.edges.enter()
			.append("path")
			.attr('class','edge')
			.style("stroke", "#ccc")
			.style("stroke-width", 1)
			.style('marker-mid','url(#markerArrow)');

		this.edges
			.exit()
			.remove();

		this.sortElements();
	};

	var sortElements = function(){
		// Places the lines behind the nodes
		this.visSettings.svgElement.selectAll(".edge,.cardNode").sort(
			function(a,b){
				var aRes = a != undefined && (a.target === undefined);
				var bRes = b != undefined && (b.target === undefined);
				if(aRes && !bRes)
				{
					return 1;
				}
				else if(aRes && bRes)
				{
					return 0;
				}

				return -1;
			}
		);
	}

	var forceDirectedGraphToHierachy = function()
	{

	};

	var forceTick = function(e){

		var me = this;
		if(me.visSettings.layoutSettings.layoutMode != 'forceDirectedGraph') {
			return;
		}

		if(!me.visSettings.layoutSettings.manualLayout) {

			me.nodes.attr("x", function(d) {
					  return d.x - (d.foWidth / 2); })
					  .attr("y", function(d) {
					  return d.y - (d.foHeight / 2); });

			// Possibly move this out of the force loop
			var anchorNode = Enumerable.From(me.nodes.data())
									   .Where(function(d){return d.nodeType === 'Anchor'})
									   .SingleOrDefault()

			// if(anchorNode != undefined)
			// {
				// var damper = 0.1
				// me.nodes.filter(function(d){
				// return d == anchorNode})
				// .attr('transform',function(d){
							// var w = me.visSettings.svgWidth;
							// var h = me.visSettings.svgHeight;
							 // //TODO move these constants to the header section
							 // //center the center (root) node when graph is cooling down
							 // if(d.index==0){
								 // damper = 0.1;
								 // d.x = d.x + (w/2 - d.x) * (damper + 0.71) * e.alpha;
								 // d.y = d.y + (h/2 - d.y) * (damper + 0.71) * e.alpha;
							 // }
							 // //start is initiated when importing nodes from XML
							 // if(d.start === true){
								 // d.x = w/2;
								 // d.y = h/2;
								 // d.start = false;
							 // }

							 // r = d.name.length;
							 // //these setting are used for bounding box, see [http://blockses.appspot.com/1129492][1]
							 // d.x = Math.max(r, Math.min(w - r, d.x));
							 // d.y = Math.max(r, Math.min(h - r, d.y));

							 // return "translate("+d.x+","+d.y+")";
				// });
			// };

			}

		else
		{
			 this.data.nodes
			 .each(function(d,i){
				this.x = ((100 +10) * i);
				this.y = 0;
			 });
			 this.visSettings.layoutSettings.manualLayout = false;
		}

		this.visSettings.svgElement.selectAll("path")
								   .data(this.data.edges)
								   .attr('d',function(d){
										var x1 = d.source.x;
										var y1 = d.source.y;

										var x2 = d.target.x;
										var y2 = d.target.y;

										var targetVector = {x : x2 - x1, y : y2 - y1};

										return 'M ' + x1 + ' ' + y1 + generatePoints(5,targetVector);
								   }.bind(this));


	};

	// Finally ! My games programming pays off ^_^
	var generatePoints = function(count,targetVector){
		var pathPoints = '';
		var inc = 1 / count;
		for(var i = inc; i <= 1;i += inc)
		{
			pathPoints += ' l ' + (targetVector.x * inc ) + ' ' + (targetVector.y * inc );
		}

		return pathPoints;
	}

	return {create : create,
			setupSvgElement : setupSvgElement,
			buildForce : buildForce,
			forceTick : forceTick,
			updateGraph : updateGraph,
			sortElements : sortElements};

}();

function ForceSettings()
{
	this.charge = -8000;
	this.linkDistance = function(d,i){return 1337;};
}

function NodeSettings()
{
	this.width = 200;
	this.height = 100;
	this.buildNode = function(d,i){return '<div class="testDiv">'+ d.name +'</div>';};
}

function VisSettings()
{
	this.svgElement = null;

	this.svgWidth = 800;
	this.svgHeight = 600;
	this.forceSettings = new ForceSettings();
	this.nodeSettings = new NodeSettings();
	this.layoutSettings = new LayoutSettings();
}

function LayoutSettings()
{
	this.layoutMode = 'forceDirectedGraph';
	this.manualLayout = false;
}
