document.addEventListener( 'DOMContentLoaded', function () {
	'use strict';

	/**
	* Transform input fields, post types into beautiful dropdown with select2 library.
	*/
	function transform( element ) {
		const options = {
			allowClear: true,
		};

		jQuery( element ).select2( options );
	}
	document.querySelectorAll( '.mb-select2' ).forEach( transform );

	document.querySelectorAll( '.mb-form' ).forEach( form => {
		form.addEventListener( 'submit', function( e ) {
			e.preventDefault();

			if ( ! confirm( mbAioTools.texts.confirm ) ) {
				return;
			}

			const form = e.target;
			const button = form.querySelector( 'button' );
			const result = form.nextElementSibling;

			const formData = new FormData( form );
			formData.append( '_ajax_nonce', mbAioTools.nonce );

			button.disabled = true;
			button.textContent = button.dataset.loading;
			result.style.display = 'none';

			fetch( ajaxurl, {
				method: 'POST',
				body: formData,
			} )
				.then( response => response.json() )
				.then( response => {
					result.textContent = response.data;
					result.style.display = 'block';
				} )
				.finally( () => {
					button.disabled = false;
					button.textContent = button.dataset.text;
				} );
		} );

		const select = form.querySelector( '.mb-select2' );
		const type   = form.querySelector( 'select[name="type"]' );
		if ( !select || !type ) {
			return;
		}

		type.addEventListener( 'change', function () {
			const typeData = new FormData();
			typeData.append( '_ajax_nonce', mbAioTools.nonce );
			typeData.append( 'action', 'mb_aio_type_filter' );
			typeData.append( 'type', this.value );

			fetch( ajaxurl, {
				method: 'POST',
				body: typeData
			} )
				.then( response => response.json() )
				.then( response => {
					if ( !response || ! Array.isArray( response?.data ) ) {
						return;
					}

					select.innerHTML = '';
					select.disabled = false;
					if ( !response.data.length ) {
						const option = document.createElement( 'option' );
						option.textContent = select.dataset.notfound;
						select.appendChild( option );
						select.disabled = true;
					} else {
						response.data.unshift('');
						response.data.forEach( function ( key ) {
							const option = document.createElement( 'option' );
							option.value = key;
							option.textContent = key;
							select.appendChild( option );
						} );
					}

					transform( select );
				} );
		} );
	} );
} );