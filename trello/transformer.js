// Convert from results of Trello API call to a format we can use in InVis

function TrelloTransformer()
{
	return this;
};

TrelloTransformer.prototype = function()
{	
	var buildDependencyOrientatedDataSet = function(cards,lists){
		
		var getCardState = function(listName){
			if (listName.toLowerCase().indexOf('blocked') === 0) {
				return 'blocked';
			} else if (listName.toLowerCase().indexOf('in progress') === 0) {
				return 'in-progress';
			} else if (listName.toLowerCase().indexOf('backlog') != -1) {
				return 'backlog';
			} else if (listName.toLowerCase().indexOf('done') === 0) {
				return 'done';
			} else if (listName.toLowerCase().indexOf('accepted') === 0) {
				return 'accepted';
			}
			return '';
		};
		
		var listsEnum = Enumerable.From(lists[0]);
		var cardsEnum = Enumerable.From(cards[0]);
		
		listsEnum.ForEach(function(list){
			list.nodeType = 'List';
			cardsEnum.Where(function(card){ return card.idList === list.id; }).ForEach(function(card, index){
				card.state = getCardState(list.name);
			});
		});
		
		// enrich cards with list info
		var listEnum = Enumerable.From(lists[0]);
		
		var nodes = [];
		
		// Create base card
		var baseNode = {name:'Project', nodeType : 'Anchor', desc: ''};
		nodes.push(baseNode);
		// Get all cards
			// Apply transforms
		var cardsEnum = Enumerable.From( cards[0]);
		cardsEnum.ForEach(function(d){
										d.nodeType = 'Card';
										nodes.push(d)});
		
		// Build links
		var links = buildLinksFromDependencies(nodes);
		
		return {nodes:nodes, edges: links};
	};
	
	var getAllDependencies = function(nodes){
		return Enumerable.From(nodes)
						 .Select(function(d,i){ return getDependencies(d.desc);})
						 .SelectMany(function(i){return i;});
	};
	
	var getDependenciesForCard = function(dependencyId,nodes)
	{
		return Enumerable.From(nodes)
						 .Where(function(d){ 
								return Enumerable.From(getDependencies(d.desc))
												 .Contains(dependencyId);})
						 .ToArray();
	};
	
	var buildLinksFromDependencies = function(nodes)
	{
		// Build links
		var links = [];
		
		var allDependencies = getAllDependencies(nodes);
										
		Enumerable.From(nodes).ForEach(function(d,i){
			var deps = getDependencies(d.desc);
			
			if(!anythingDependsOnThisCard(d,allDependencies))
			{
				// add a link to the anchorNode
				links.push({source : i, target : 0});
			}
						
			Enumerable.From(deps).ForEach(function(depId){
				var index = getIndexFromShortId(depId, nodes);
				if (index > -1)
				{
					links.push({target : i, source : getIndexFromShortId(depId, nodes)});
				}
			});
			
		});	
		
		return links;
	}
	
	var anythingDependsOnThisCard = function(c,cardCollection){
			return cardCollection.Contains(c.shortLink);
		}
	
	var getIndexFromShortId = function(id,nodes){
	
		var node = Enumerable.From(nodes).SingleOrDefault(-1, function(n){
			return n.shortLink !== undefined && n.shortLink === id;
		});
		
		return (node === -1) ? node : nodes.indexOf(node);
	};
	
	var getDependencies = function(s){
		var dependsPattern = /DependsOn\((.+)\)/g;
		
		var dependsOn = [];
		
		var match = null;
		while(match = dependsPattern.exec(s))
		{
			dependsOn.push(match[1]);
		}
		
		return dependsOn;
	};
	
	var buildListOrientatedDataSet = function(cards,lists){
			
				var listsEnum = Enumerable.From( lists[0]);
				listsEnum.ForEach(function(d){d.nodeType = 'List'});
				
				var cardsEnum = Enumerable.From( cards[0]);
				cardsEnum.ForEach(function(d){d.nodeType = 'Card'});
			
				var nodes = listsEnum.Union(cardsEnum).ToArray();
			
				// The index is important here
				var getListId = function(card){
				
					if(card.nodeType == 'List') {return -1;}
					
					var matchingList = Enumerable.From(nodes).Single(function(d){ return d.nodeType == 'List' && d.id === card.idList});
					return listsEnum.IndexOf(matchingList);
				};
				
				var edges = Enumerable.From(nodes).Select(function(d,i){ 
				return {source : i, 
						target : getListId(d) }
				}).Where(function(d){return d.target != -1;}).ToArray();
				
				var centralNodeIndex = nodes.push({name:'Lists', nodeType : 'Anchor'}) - 1;
				
				edges = Enumerable.From(edges).Union(Enumerable.From(nodes)
						  .Select(function(d,i){return {source :centralNodeIndex, target : i, targetNodeType : d.nodeType }})
						  .Where(function(d){return d.targetNodeType == 'List'})).ToArray();
				
				return {nodes:nodes, edges: edges};
			
			};
			
	return {
		buildListOrientatedDataSet:buildListOrientatedDataSet,
		buildDependencyOrientatedDataSet : buildDependencyOrientatedDataSet,
		buildLinksFromDependencies : buildLinksFromDependencies,
		getDependenciesForCard : getDependenciesForCard
	};
}();