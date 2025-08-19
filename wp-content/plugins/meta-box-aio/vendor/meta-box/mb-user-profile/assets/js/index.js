import { checkRecaptcha } from './helpers.js';

const $ = jQuery;
const disableButtons = $btn => $btn.prop( 'disabled', true );
const enableButtons = $btn => $btn.prop( 'disabled', false );

function processForm() {
	const $form = $( this ),
		key = 'MBUP_Data_' + $form.find( '[name^="mbup_key"]' ).val(),
		i18n = window[ key ];

	if ( typeof i18n !== 'object' ) {
		return;
	}

	// Set ajax URL for ajax actions like query images for image_advanced fields.
	if ( typeof window.ajaxurl === 'undefined' ) {
		window.ajaxurl = i18n.ajaxUrl;
	}

	const $submitBtn = $form.find( '[name^="rwmb_profile_submit"]' );
	const validate = () => {
		$( '#rwmb-validation-message' ).remove(); // Remove all previous validation message.
		return !$.validator || $form.valid();
	};

	// Native form submit. Can't use form.submit() because form.submit is the submit button, not a function.
	const submitCallback = () => HTMLFormElement.prototype.submit.call( $form[ 0 ] );

	function handleSubmitClick( e ) {
		if ( i18n.recaptchaKey ) {
			e.preventDefault();
		}

		// Do nothing when the form is not validated.
		if ( !validate() ) {
			return;
		}

		disableButtons( $submitBtn );

		if ( i18n.recaptchaKey ) {
			checkRecaptcha( {
				key: i18n.recaptchaKey,
				success: token => {
					$form.find( 'input[name="mbup_recaptcha_token"]' ).val( token );
					submitCallback();
				},
				error: () => alert( i18n.captchaExecuteError )
			} );
		} else {
			submitCallback();
		}
	}

	$submitBtn.on( 'click', handleSubmitClick );
	processPasswordStrength( i18n, $form, $submitBtn );
}

function processPasswordStrength( i18n, $form, $submitBtn ) {
	if ( !i18n.id_password || !i18n.id_password2 ) {
		return;
	}

	const $user_pass = $form.find( '#' + i18n.id_password ),
		$user_pass2 = $form.find( '#' + i18n.id_password2 ),
		$result = $form.find( '#password-strength' )
		check = () => checkPasswordStrength( i18n, $submitBtn, $result, $user_pass.val(), $user_pass2.val() );

	$user_pass.on( 'keyup', check );
	$user_pass2.on( 'keyup', check );
}

function checkPasswordStrength( i18n, $submitBtn, $result, password, password2 ) {
	const types = [ 'very-weak', 'very-weak', 'weak', 'medium', 'strong', 'mismatch' ],
		requiredStrength = types.indexOf( i18n.strength );

	if ( !password ) {
		$result.hide();
		return;
	}

	// Reset the form & meter.
	disableButtons( $submitBtn );
	$result.removeClass( 'very-weak weak medium strong mismatch' ).show();

	// Get the password strength.
	const strength = wp.passwordStrength.meter( password, wp.passwordStrength.userInputDisallowedList(), password2 );
	if ( 0 > strength || 5 < strength ) {
		return;
	}

	const type = types[ strength ];
	$result.addClass( type ).html( i18n[ type ] );
	if ( requiredStrength <= strength && 5 !== strength ) {
		enableButtons( $submitBtn );
	}
}

$( () => $( '.rwmb-form' ).each( processForm ) );