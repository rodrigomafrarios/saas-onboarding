import React from "react";
import axios from "axios";

import { validateTenantRegistrationForm as validateSignUpForm } from "./validate";
import { SignUpTenantForm } from "./signup-tenant-form";

class SignUpTenantContainer extends React.Component<any, any> {
  constructor(props: any) {
    super(props);

    this.state = {
      errors: {} as any,
      tenant: {
        subDomain: "",
        adminEmail: "",
        name: "",
        tier: ""
      },
    } as any;

    this.handleChange = this.handleChange.bind(this);
    this.submitSignup = this.submitSignup.bind(this);
    this.validateForm = this.validateForm.bind(this);
  }

  handleChange(event: { target: { name: any; value: any; }; }) {
    const field = event.target.name;
    const tenant = this.state.tenant;
    tenant[field] = event.target.value;

    this.setState({
      tenant
    });
  }

  submitSignup(tenant: { subDomain: string; adminEmail: string; name: string; tier: string; }) {
    const params = {
      subDomain: tenant.subDomain,
      adminEmail: tenant.adminEmail,
      name: tenant.name,
      tier: tenant.tier
    };

    axios
      .put(`${process.env.REACT_APP_BASE_URL}/tenant`, params)
      .then(res => {
        if (res.status === 201) {
          alert("Invitation for the admin user was sent");
          window.location.reload();
        } else {
          this.setState({
            errors: { message: res }
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
    var payload = validateSignUpForm(this.state.tenant);
    if (payload.success) {
      this.setState({
        errors: {}
      });

      this.submitSignup({
        subDomain: this.state.tenant.subDomain,
        adminEmail: this.state.tenant.adminEmail,
        name: this.state.tenant.name,
        tier: this.state.tenant.tier
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
        <SignUpTenantForm
          onSubmit={this.validateForm}
          onChange={this.handleChange}
          errors={this.state.errors}
          tenant={this.state.tenant}
          title={this.state.title}
        />
      </div>
    );
  }
}

export default SignUpTenantContainer