var TrelloInvisDepApp = function(){

	this.baseTrelloUrl = 'https://api.trello.com/1/';
	this.trelloKey = '&key=30ba6112a9c864cb0ef59ee7f62478d7&token=';
	this.boardShortlink = window.location.search.match(/boardShortLink\=(.+)&/)[1];
	this.trelloToken = window.location.search.match(/trelloToken\=(.+)/)[1];
	Trello.setToken(this.trelloToken);

	this.board = 'boards/' + this.boardShortlink;

	this.nodeW = 100;
	this.nodeH = 100;

	this.w = 800;
	this.h = 600;

	//Bad
	cssClone = false;

	this.dependent = null,
	this.dependency = null;
};

TrelloInvisDepApp.prototype = function(){

	var loadDataFromTrello = function()
	{
		var cardApiUrl = this.baseTrelloUrl + this.board +'/cards?fields=name,shortLink,idList,desc' + this.trelloKey + this.trelloToken;
		var listApiUrl = this.baseTrelloUrl + this.board +'/lists?fields=name,shortLink,idList' + this.trelloKey + this.trelloToken;
		return $.when($.ajax({url : cardApiUrl}),$.ajax({url : listApiUrl}));
	};

	var setupChildCommunication = function()
	{
			// Create IE + others compatible event handler
			var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
			var eventer = window[eventMethod];
			var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

			var promise = new $.Deferred();

			// Listen to message from child window
			eventer(messageEvent,function(e) {

				if(e.data.type !== undefined)
				{
					switch(e.data.type)
					{
						case 'css':
						{
						if(cssClone === true) {break;}

							var links = (e.data.links);
							Enumerable.From(links)
									  .ForEach(function(e){
													$('#customStyle').before('<link rel="stylesheet" href="'+ e +'" />');
												});
							cssClone = true;
						}break;

						case 'cards':
						{
						  //BAD !
						  cardViews = $('<p></p>');
						  Enumerable.From(e.data.cards).ForEach(function(c){
							cardViews.append($(c));
						  });
						  promise.resolve();
						}break;

						case 'dependencyAdded':
						case 'dependencyRemoved':
						{
							this.updateDataFromTrello();
						}break;
					}
				}

			}.bind(this),false);
		return promise;
	};

	var updateDataFromTrello = function()
	{
		this.loadDataFromTrello().done(function(cardResult,listResult){
			var cards = cardResult;
			var lists = listResult;
			var dataset = new TrelloTransformer().buildDependencyOrientatedDataSet(cards,lists);
			this.invis.updateGraph(this.settings,dataset);
		}.bind(this));
	}

	var init = function()
	{

		$.when(this.loadDataFromTrello(),this.setupChildCommunication())
		.done(function(results){


			$('.loadingMessage').hide();
			var cards = results[0];
			var lists = results[1];

			var dataset = new TrelloTransformer().buildDependencyOrientatedDataSet(cards,lists);

			this.invis = new InVis();

			var markerHtml = '<marker id="markerArrow" markerWidth="30" markerHeight="13" refx="2" refy="7" orient="auto"> <path d="M25,7 L2,13 L8,7 L2,2"></path> </marker>';
			//var markerHtml = '<marker id="markerArrow" markerWidth="30" markerHeight="30" refX="15" refY="15" orient="auto"> <path d="M30,15 L0,30 L5,15 L2,0"></path> </marker>';
			//var markerHtml = '<marker id="markerCircle" markerWidth="8" markerHeight="8" refx="5" refy="5">    <circle cx="5" cy="5" r="3" style="stroke: none; fill:#000000;"/></marker>';

			setInterval(function(){

				var endX = 30;
				var ma = $('#markerArrow');
				if($('#markerArrow').length < 0) {return;}

				var newX = parseInt( ma[0].getAttribute('refX')) - 1;
				if(newX <= -endX) {newX = endX-1;}

				ma[0].setAttribute('refX',newX);
			},10);

			this.settings = buildSettings(markerHtml);

			this.invis.create(this.settings,dataset);

			$('#removeDependencyButton').click(function(){this.removeDependencyClick(this.settings,dataset);}.bind(this));
			$('#addDependencyButton').click(function(){this.addDependencyClicked(this.settings,dataset);}.bind(this));
			$('#cancelDependencyButton').click(function(){this.resetDependencyFlow();}.bind(this));

			$('#removeAllDependencies').click(function(){this.removeAllDependencies(this.settings,dataset);}.bind(this));


			}.bind(this));


	};

	var resetDependencyFlow = function (){
			$('#dependency').text('Add dependency');

			$('#cancelDependencyButton').hide();

			$('#addDependencyButton').show();
			$('#removeDependencyButton').show();

			$('#dependency').text('');
			$('#dependant').text('');

			this.dependency = null,this.dependent = null;
			$(this.settings.svgElement[0]).unbind('mousedown',removeDependencyMouseDown);
			$(this.settings.svgElement[0]).unbind('mousedown',addDependencyMouseDown);

		};

	var removeAllDependencies = function(settings,dataset){
		var dependent = null, dependency = null;

		var data = this.invis.data;

		this.invis.updateGraph(this.settings,{nodes: data.nodes, edges : []});
	};


	var removeDependencyMouseDown = function removeDepMouseDown(e)
	{
			me = e.data;

			if(me.dependency == null)
			{
				var dependency = getCardDataFromTarget(e.target);
				var dependencies = new TrelloTransformer().getDependenciesForCard(dependency.shortLink,me.invis.data.nodes);
				me.dependency = dependency;

				// If there's just one dependency then remove that
				if(dependencies.length == 1)
				{
					var dependShortLink = dependencies[0].shortLink;
					var dependent =  Enumerable.From(me.invis.data.nodes).Single(function(d){return d.shortLink == dependShortLink});
					removeDependency(me.dependency,dependent);
					me.resetDependencyFlow(true);
					return;
				}

				$('#dependant').text('Click on the dependent');
				return;
			}

			if(dependent == null)
			{
				var dependent = getCardDataFromTarget(e.target);
				removeDependency(me.dependency,dependent);
				me.resetDependencyFlow(true);
				return;
			}
	};

	var removeDependencyClick = function(settings,dataset){
		this.resetDependencyFlow();
		$('#addDependencyButton').hide();
		$('#removeDependencyButton').hide();
		$('#cancelDependencyButton').show();

		$('#dependant').text('click on the dependency to remove');

		var dependent = null, dependency = null;

		$(settings.svgElement[0]).mousedown(this,this.removeDependencyMouseDown);
	};

	var getCardDataFromTarget = function(target)
	{
		var cardObject = $(target).parents('foreignObject').first();
		return dependency = d3.select(cardObject[0]).data()[0];
	};

	var addDependencyMouseDown = function dependencyMouseDown(e){

		$('#removeDependencyButton').hide();
		me = e.data;
		if(me.dependency == null)
				{
					me.dependency = getCardDataFromTarget(e.target);
					$('#dependency').text(dependency.name);
					$('#dependant').text('click on the dependent');
				}
				else if(me.dependent === null)
				{
					me.dependent = getCardDataFromTarget(e.target);
					$('#dependant').text(me.dependent.name);

					createNewDependency(me.dependency,me.dependent);
					me.resetDependencyFlow(true);
					me.dependency = null,me.dependent = null;
				}
	};

	var addDependencyClicked = function(settings,dataset){
		this.resetDependencyFlow(true);
		$('#addDependencyButton').hide();
		$('#removeDependencyButton').hide();

		$('#cancelDependencyButton').show();



		$('#dependency').text('click on the dependency');
		$(settings.svgElement[0]).mousedown(this,this.addDependencyMouseDown);
	};

	var createNewDependency = function(dependency,dependent)
	{
		window.parent.postMessage({type:'addDependency',
								   dependency : dependency,
								   dependent : dependent},'*');
	}

	var removeDependency = function(dependency,dependent)
	{
		window.parent.postMessage({type:'removeDependency',
								   dependency : dependency,
								   dependent : dependent},'*');
	}

	//var updateLinksBasedOn

	var buildSettings = function(markerHtml){
		var settings = new VisSettings();
				settings.svgElement = d3.select("body").append("svg");
										//.attr('viewBox','0 0 1920 1024')
										//.attr('perserveAspectRatio','xMinYMid');

				settings.svgElement.append('defs')
								   .html(markerHtml);

				settings.svgHeight = $(document).height();
				settings.svgWidth = $(document).width();

				settings.forceSettings.linkDistance = function(d,i){
					switch(d.source.nodeType)
					{
						case 'Card':{
							return 150;
						break;}

						case 'List':{
							return 100;
						break;}

						case 'Anchor':{
							return 180;
						break;}
					}
				};


				var buildTemplate = function(templateName){
					var template = $('#templates #'+templateName+' > div').clone();
					return template;
				};

				var convertTemplateToHtml = function(t){
					return $('<p><p/>').append(t).html();
				}

				settings.nodeSettings.buildNode = function(d){
				if(d.nodeType == 'Card')
				{

					var findCard = function(name){
						return cardViews.find(".list-card").filter(":has(a:contains('"+name+"'))");
					}

					//Find in parent
					var card = findCard(d.name);
					if(card.length === 0)
					{
						var storyPointsMatch = d.name.match(/(\(|\[).+(\)|\])(.+)/);
						if(storyPointsMatch !== null)
						{
							var nameWithoutStoryPoints = storyPointsMatch[3];
							card = findCard(nameWithoutStoryPoints);
						}
						else
						{
							storyPointsMatch = d.name.match(/(.+)\W\(\?\)/)
							if(storyPointsMatch !== null)
							{
								nameWithoutStoryPoints = storyPointsMatch[1]
								card = findCard(nameWithoutStoryPoints);
							}
						}
					}

					card.addClass(d.state);

					//return convertTemplateToHtml($template);
					return convertTemplateToHtml(card[0].outerHTML);

				}

				if(d.nodeType == 'List')
				{
					var template = buildTemplate('listTemplate');
					template.find('.name').text(d.name);
					return convertTemplateToHtml(template);
				}

				if(d.nodeType == 'Anchor')
				{
					var template = buildTemplate('anchorTemplate');
					template.find('.name').text(d.name);
					return convertTemplateToHtml(template);
				}


				};
		return settings;
	};

	return {
		init:init,
		loadDataFromTrello:loadDataFromTrello,
		setupChildCommunication : setupChildCommunication,
		removeDependencyClick : removeDependencyClick,
		removeAllDependencies : removeAllDependencies,
		updateDataFromTrello : updateDataFromTrello,
		addDependencyMouseDown : addDependencyMouseDown,
		addDependencyClicked : addDependencyClicked,
		removeDependencyMouseDown : removeDependencyMouseDown,
		resetDependencyFlow : resetDependencyFlow
	};
}();

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-46145442-5']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

var app = new TrelloInvisDepApp();
app.init();
