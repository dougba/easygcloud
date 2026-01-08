import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	FormTokenField,
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';
import './editor.scss';

export default function Edit( { attributes, setAttributes } ) {
	let {
		meta_box_id, // @deprecated: use id instead. Previously, it's a string of field group IDs separated by commas.
		id,          // An array of field group IDs.
		redirect,
		form_id,
		recaptcha_key,
		recaptcha_secret,
		label_title,
		label_username,
		label_email,
		label_password,
		label_password2,
		label_submit,
		id_username,
		id_email,
		id_password,
		id_password2,
		id_submit,
		confirmation,
		email_confirmation,
		password_strength,
		email_as_username,
		show_if_user_can,
		role,
		append_role,
		auto_login
	} = attributes;

	if ( id.length === 0 && meta_box_id ) {
		id = meta_box_id.split( ',' );
	}
	// Remove invalid field group IDs.
	id = id.filter( i => mbupRegisterData.field_groups.some( fg => fg.value === i ) );

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
						suggestions={ mbupRegisterData.field_groups }
						saveTransform={ item => item?.value || '' }
						displayTransform={ item => mbupRegisterData.field_groups.find( fg => fg.value === ( typeof item === 'string' ? item : item.value ) )?.label || '' }
					/>
					<TextControl
						label={ __( 'Redirect URL', 'mb-user-profile' ) }
						help={ __( 'Redirect URL, to which users will be redirected after successful registration.', 'mb-user-profile' ) }
						value={ redirect }
						onChange={ update( 'redirect' ) }
					/>
					<ToggleControl
						label={ __( 'Use email for username', 'mb-user-profile' ) }
						checked={ email_as_username }
						onChange={ update( 'email_as_username' ) }
					/>
					<ToggleControl
						label={ __( 'Send confirmation email', 'mb-user-profile' ) }
						checked={ email_confirmation }
						onChange={ update( 'email_confirmation' ) }
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
						label={ __( 'Show if user can', 'mb-user-profile' ) }
						help={ __( 'Enter a WordPress capability. Useful if admins want to register for other people.', 'mb-user-profile' ) }
						value={ show_if_user_can }
						onChange={ update( 'show_if_user_can' ) }
					/>
					<TextControl
						label={ __( 'New user role', 'mb-user-profile' ) }
						value={ role }
						onChange={ update( 'role' ) }
					/>
					<ToggleControl
						label={ __( 'Append role', 'mb-user-profile' ) }
						checked={ append_role }
						onChange={ update( 'append_role' ) }
					/>
					<ToggleControl
						label={ __( 'Auto login after created account', 'mb-user-profile' ) }
						checked={ auto_login }
						onChange={ update( 'auto_login' ) }
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
						label={ __( 'Username field label', 'mb-user-profile' ) }
						value={ label_username }
						onChange={ update( 'label_username' ) }
					/>
					<TextControl
						label={ __( 'Email field label', 'mb-user-profile' ) }
						value={ label_email }
						onChange={ update( 'label_email' ) }
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
						label={ __( 'Username field ID', 'mb-user-profile' ) }
						value={ id_username }
						onChange={ update( 'id_username' ) }
					/>
					<TextControl
						label={ __( 'Email field ID', 'mb-user-profile' ) }
						value={ id_email }
						onChange={ update( 'id_email' ) }
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
						help={ __( 'Confirmation message if registration is successful.', 'mb-user-profile' ) }
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
				block="meta-box/registration-form"
				attributes={ attributes }
			/>
		</div>
	);
}
