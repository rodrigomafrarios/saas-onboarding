import React from "react";
import axios from "axios";

import { validateForgotPasswordForm } from "./validate";
import { ForgotPasswordForm } from "./forgot-password-form";

class ForgotPasswordContainer extends React.Component<any, any> {
  constructor(props: any) {
    super(props);

    this.state = {
      errors: {} as any,
      forgotPassword: {
        email: "",
      } as any,
    } as any;

    this.handleChange = this.handleChange.bind(this);
    this.submitForgotPassword = this.submitForgotPassword.bind(this);
    this.validateForm = this.validateForm.bind(this);
  }

  handleChange(event: { target: { name: any; value: any; }; }) {
    const field = event.target.name;
    const forgotPassword = this.state.forgotPassword;
    forgotPassword[field] = event.target.value;

    this.setState({
      forgotPassword
    });
  }

  submitForgotPassword(forgotPassword: { email: string }) {
    const params = {
      email: forgotPassword.email,
    };

    axios
      .post(`${process.env.REACT_APP_BASE_URL}/forgot-password`, params)
      .then(res => {
        if (res.status === 204) {
          alert("An e-mail was delivered in order to reset password")
          window.location.reload();
        } else {
          this.setState({
            errors: { message: res.data }
          });
        }
      })
      .catch((err: any) => {
        alert("Oops! An error occoured. Check the console.");
        console.error(err)
      });
  }

  validateForm(event: { preventDefault: () => void; }) {
    event.preventDefault();  
    
    const payload = validateForgotPasswordForm(this.state.forgotPassword);

    if (payload.success) {
      this.setState({
        errors: {}
      });
      this.submitForgotPassword({
        email: this.state.forgotPassword.email
      });
    } else {
      const errors = payload.errors;
      this.setState({
        errors
      });
    }
  }

  render() {
    return (
      <div>
        <ForgotPasswordForm
          onSubmit={this.validateForm}
          onChange={this.handleChange}
          errors={this.state.errors}
          forgotPassword={this.state.forgotPassword}
        />
      </div>
    );
  }
}

export default ForgotPasswordContainer