import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	FormTokenField,
	PanelBody,
	SelectControl,
	TextControl
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';
import './editor.scss';

export default function Edit( { attributes, setAttributes } ) {
	let {
		meta_box_id, // @deprecated: use id instead. Previously, it's a string of field group IDs separated by commas.
		id,          // An array of field group IDs.
		user_id,
		redirect,
		form_id,
		recaptcha_key,
		recaptcha_secret,
		label_title,
		label_password,
		label_password2,
		label_submit,
		id_password,
		id_password2,
		id_submit,
		confirmation,
		password_strength
	} = attributes;

	if ( id.length === 0 && meta_box_id ) {
		id = meta_box_id.split( ',' );
	}
	// Remove invalid field group IDs.
	id = id.filter( i => mbupProfileData.field_groups.some( fg => fg.value === i ) );

	let passwordStrength = [
		{
			label: 'Strong',
			value: 'strong'
		},
		{
			label: 'Medium',
			value: 'medium'
		},
		{
			label: 'Weak',
			value: 'weak'
		},
		{
			label: 'Very weak',
			value: 'very-weak'
		}
	];

	const update = key => value => setAttributes( { [ key ]: value } );

	return (
		<div { ...useBlockProps() }>
			<InspectorControls>
				<PanelBody className="mbup-block" title={ __( 'Settings', 'mb-user-profile' ) }>
					<FormTokenField
						__experimentalAutoSelectFirstMatch
						__experimentalExpandOnFocus
						label={ __( 'Field group', 'mb-user-profile' ) }
						value={ id }
						onChange={ update( 'id' ) }
						suggestions={ mbupProfileData.field_groups }
						saveTransform={ item => item?.value || '' }
						displayTransform={ item => mbupProfileData.field_groups.find( fg => fg.value === ( typeof item === 'string' ? item : item.value ) )?.label || '' }
					/>
					<TextControl
						label={ __( 'Redirect URL', 'mb-user-profile' ) }
						help={ __( 'Redirect URL, to which users will be redirected after successful submission.', 'mb-user-profile' ) }
						value={ redirect }
						onChange={ update( 'redirect' ) }
					/>
					<SelectControl
						label={ __( 'Password strength', 'mb-user-profile' ) }
						value={ password_strength }
						options={ [
							{ label: '-', value: '' },
							...passwordStrength
						] }
						onChange={ update( 'password_strength' ) }
					/>
					<TextControl
						label={ __( 'User ID', 'mb-user-profile' ) }
						help={ __( 'User ID, whose info will be edited. If not specified, current user ID is used.', 'mb-user-profile' ) }
						value={ user_id }
						onChange={ update( 'user_id' ) }
					/>
				</PanelBody>
				<PanelBody title={ __( 'Appearance', 'mb-user-profile' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'Form ID', 'mb-user-profile' ) }
						value={ form_id }
						onChange={ update( 'form_id' ) }
					/>
					<TextControl
						label={ __( 'Form title', 'mb-user-profile' ) }
						value={ label_title }
						onChange={ update( 'label_title' ) }
					/>
					<TextControl
						label={ __( 'Password field label', 'mb-user-profile' ) }
						value={ label_password }
						onChange={ update( 'label_password' ) }
					/>
					<TextControl
						label={ __( 'Confirm password field label', 'mb-user-profile' ) }
						value={ label_password2 }
						onChange={ update( 'label_password2' ) }
					/>
					<TextControl
						label={ __( 'Submit button text', 'mb-user-profile' ) }
						value={ label_submit }
						onChange={ update( 'label_submit' ) }
					/>
					<TextControl
						label={ __( 'Password field ID', 'mb-user-profile' ) }
						value={ id_password }
						onChange={ update( 'id_password' ) }
					/>
					<TextControl
						label={ __( 'Confirm password field ID', 'mb-user-profile' ) }
						value={ id_password2 }
						onChange={ update( 'id_password2' ) }
					/>
					<TextControl
						label={ __( 'Submit button ID', 'mb-user-profile' ) }
						value={ id_submit }
						onChange={ update( 'id_submit' ) }
					/>
					<TextControl
						label={ __( 'Confirmation text', 'mb-user-profile' ) }
						help={ __( 'Confirmation message if the form submission is successful.', 'mb-user-profile' ) }
						value={ confirmation }
						onChange={ update( 'confirmation' ) }
					/>
				</PanelBody>
				<PanelBody title={ __( 'Google reCaptcha (v3)', 'mb-user-profile' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'Site key', 'mb-user-profile' ) }
						value={ recaptcha_key }
						onChange={ update( 'recaptcha_key' ) }
					/>
					<TextControl
						label={ __( 'Secret key', 'mb-user-profile' ) }
						value={ recaptcha_secret }
						onChange={ update( 'recaptcha_secret' ) }
					/>
				</PanelBody>
			</InspectorControls>
			<ServerSideRender
				block="meta-box/profile-form"
				attributes={ attributes }
			/>
		</div>
	);
}
