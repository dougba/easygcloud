import apiFetch from '@wordpress/api-fetch';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { Notice, PanelBody, SelectControl } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';

export default function Edit( { attributes, setAttributes } ) {
	const { id = 0 } = attributes;
	const [ views, setViews ] = useState( [] );
	const [ error, setError ] = useState( null );

	useEffect( () => {
		apiFetch( { path: '/mbv/list' } )
			.then( ( data ) => setViews( data ) )
			.catch( ( err ) => {
				setError( err.message || __( 'Error fetching views', 'mb-views' ) );
			} );
	}, [] );

	const blockProps = useBlockProps();

	const options = [ { value: 0, label: __( '— Select a view —', 'mb-views' ) } ].concat( views.map( v => ( { value: v.id, label: v.title } ) ) );

	return (
		<div { ...blockProps }>
			<InspectorControls>
				<PanelBody title={ __( 'Settings', 'mb-views' ) } initialOpen={ true }>
					{ error && <Notice status="error">{ error }</Notice> }
					<SelectControl
						value={ id }
						options={ options }
						onChange={ val => setAttributes( { id: parseInt( val, 10 ) || 0 } ) }
					/>
				</PanelBody>
			</InspectorControls>

			<ServerSideRender block="meta-box/view" attributes={ attributes } />
		</div>
	);
}
