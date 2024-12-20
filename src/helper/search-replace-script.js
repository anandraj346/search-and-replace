var $ = jQuery;
$(document).ready(function () {
	$(window).on('stateChanged', function (event) {

		var state = event.originalEvent.detail;
		const specificWord = state.matchString;
		const regex = new RegExp(`(?<!<[^>]*?)\\b${specificWord}\\b(?![^<]*?>)`, state.caseSensitive ? 'g' : 'gi');

		if(state.showMatches){

			if($('.js-search-matches').length == 0){
				let search_matches_html = `
					<div class="components-modal__frame search-replace-modal js-search-matches" style="height:400px;">
						<div class="components-modal__content" style="max-width: 350px;">
							<div class="components-modal__header">
								<div class="components-modal__header-heading-container">
									<h1 id="components-modal-header-0" class="components-modal__header-heading">Search &amp; Replace Matches</h1>
								</div>
							</div>
							<div>
								<ul style="list-style:decimal;" class="search-matches-list">
									${[...state.matches].map(match => {
										const updatedStr = match.replace(regex, (e) => `<span class="search-word-highlight" style="background:yellow;">${e}</span>`);
										return `<li>${updatedStr}</li>`;
									}).join('')}
								</ul>
							</div>
						</div>
					</div>
				`;
				$('.components-modal__screen-overlay').append(search_matches_html);	
			}else{
				let search_matches_list = `
					<ul style="list-style:decimal;" class="search-matches-list">
						${[...state.matches].map(match => {
							const updatedStr = match.replace(regex, (e) => `<span class="search-word-highlight" style="background:yellow;">${e}</span>`);
							return `<li>${updatedStr}</li>`;
						}).join('')}
					</ul>
				`;
				$('.js-search-matches .search-matches-list').replaceWith(search_matches_list);
			}
		}else{
			$('.js-search-matches').remove();
		}
	});
})
