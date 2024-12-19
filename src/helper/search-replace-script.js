var $ = jQuery;
$(document).ready(function () {
	$(window).on('stateChanged', function (event) {

		var state = event.originalEvent.detail;
		
		if(state.showMatches){
			let search_matches_html = `
				<div class="components-modal__frame search-replace-modal js-search-matches" style="height:400px;">
					<div class="components-modal__content" style="max-width: 350px;">
						<div class="components-modal__header">
							<div class="components-modal__header-heading-container">
								<h1 id="components-modal-header-0" class="components-modal__header-heading">Search &amp; Replace Matches</h1>
							</div>
						</div>
						<div>
							${[...state.matches].map(match => `<p>${match}</p>`).join('')}
						</div>
					</div>
				</div>
			`;

			if($('.js-search-matches').length == 0){
				$('.components-modal__screen-overlay').append(search_matches_html);	
			}else{
				$('.js-search-matches').replaceWith(search_matches_html);
			}
		}else{
			$('.js-search-matches').remove();
		}
	});
})