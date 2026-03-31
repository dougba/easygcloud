{
	const button = document.querySelector( '#mbv-publish' );
	const form = document.querySelector( '#post' );

	const updateNewPostUrl = () => {
		const postId = document.querySelector( '#post_ID' )?.value;
		if ( !postId ) {
			return;
		}

		// Only update URL if we're on the new post page.
		if ( location.href.includes( 'post-new.php' ) ) {
			history.replaceState( {}, '', `${ MBViewsSave.adminUrl }post.php?post=${ postId }&action=edit` );
		}
	};

	const handleSavePost = e => {
		e.preventDefault();

		button.disabled = true;

		const formData = new FormData( form );
		formData.set( 'action', 'mbv_save_post' );
		formData.set( 'nonce', MBViews.nonce );

		fetch( ajaxurl, {
			method: 'POST',
			body: formData
		} )
			.then( response => response.json() )
			.then( response => {
				showNotice( response.data.message, 'success' );

				// Update shortcode and post name.
				updateSlug( response.data.slug );

				// Prevent browser from showing "unsaved changes" notice.
				if ( wp?.autosave?.server ) {
					wp.autosave.server.postChanged = () => false;
				}
				history.replaceState( null, '', window.location.href );
			} )
			.catch( response => showNotice( response.data, 'error' ) );

		button.disabled = false;
	};

	const updateSlug = slug => {
		const shortcode = document.querySelector( '#mbv-shortcode input[type="text"]' );
		if ( shortcode ) {
			shortcode.value = `[mbv name="${ slug }"]`;
		}
		const postName = document.querySelector( '#post_name' );
		if ( postName ) {
			postName.value = slug;
		}
	};

	const showNotice = ( message, type ) => {
		const notice = document.createElement( 'div' );
		notice.className = `notice notice-${ type || 'info' } is-dismissible`;
		notice.innerHTML = `<p>${ message }</p><button type="button" class="notice-dismiss"></button>`;

		form.parentNode.insertBefore( notice, form );

		const dismiss = notice.querySelector( '.notice-dismiss' );
		const removeNotice = () => notice.remove();

		dismiss.addEventListener( 'click', removeNotice );
		setTimeout( removeNotice, 5000 );
	};

	form.addEventListener( 'submit', handleSavePost );

	document.addEventListener( 'keydown', e => {
		if ( ( e.ctrlKey || e.metaKey ) && e.key === 's' ) {
			e.preventDefault();
			handleSavePost( e );
		}
	} );

	updateNewPostUrl();
}
