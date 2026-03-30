import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import ServerSideRender from '@wordpress/server-side-render';
import './editor.scss';

export default function Edit( { attributes, setAttributes } ) {
	const {
		redirect,
		form_id,
		recaptcha_key,
		recaptcha_secret,
		label_title,
		label_username,
		label_password,
		label_remember,
		label_lost_password,
		label_submit,
		id_username,
		id_password,
		id_remember,
		id_submit,
		value_username,
		value_remember,
		confirmation,
	} = attributes;

	const update = key => value => setAttributes( { [ key ]: value } );

	return (
		<div { ...useBlockProps() }>
			<InspectorControls>
				<PanelBody className="mbup-block" title={ __( 'Settings', 'mb-user-profile' ) }>
					<TextControl
						label={ __( 'Redirect URL', 'mb-user-profile' ) }
						help={ __( 'Redirect URL, to which users will be redirected after successful login.', 'mb-user-profile' ) }
						value={ redirect }
						onChange={ update( 'redirect' ) }
					/>
					<ToggleControl
						label={ __( 'Remember login', 'mb-user-profile' ) }
						checked={ value_remember }
						onChange={ update( 'value_remember' ) }
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
						label={ __( 'Password field label', 'mb-user-profile' ) }
						value={ label_password }
						onChange={ update( 'label_password' ) }
					/>
					<TextControl
						label={ __( 'Remember checkbox label', 'mb-user-profile' ) }
						value={ label_remember }
						onChange={ update( 'label_remember' ) }
					/>
					<TextControl
						label={ __( 'Lost password field label', 'mb-user-profile' ) }
						value={ label_lost_password }
						onChange={ update( 'label_lost_password' ) }
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
						label={ __( 'Password field ID', 'mb-user-profile' ) }
						value={ id_password }
						onChange={ update( 'id_password' ) }
					/>
					<TextControl
						label={ __( 'Remember checkbox ID', 'mb-user-profile' ) }
						value={ id_remember }
						onChange={ update( 'id_remember' ) }
					/>
					<TextControl
						label={ __( 'Submit button ID', 'mb-user-profile' ) }
						value={ id_submit }
						onChange={ update( 'id_submit' ) }
					/>
					<TextControl
						label={ __( 'Confirmation text', 'mb-user-profile' ) }
						value={ confirmation }
						onChange={ update( 'confirmation' ) }
					/>
					<TextControl
						label={ __( 'Default username value', 'mb-user-profile' ) }
						value={ value_username }
						onChange={ update( 'value_username' ) }
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
				block="meta-box/login-form"
				attributes={ attributes }
			/>
		</div>
	);
}
