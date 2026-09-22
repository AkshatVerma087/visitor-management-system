const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../lib/prisma');

async function registerEmployee(data) {
  // Extract user details from the payload
  const { name, email, password, department, role, office_id } = data;

  // Validate presence of essential fields
  if (!name || !email || !password || !office_id) {
    throw new Error('Missing required fields: name, email, password, office_id');
  }

  const existing = await prisma.employee.findUnique({ where: { email } });
  if (existing) {
    throw new Error('Email already registered');
  }

  // Securely hash the user's password before storing
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the new employee record
  const employee = await prisma.employee.create({
    data: {
      name,
      email,
      password: hashedPassword,
      department,
      role: role || 'Host',
      office_id
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      office_id: true
      // Omit password from return
    }
  });

  return employee;
}

async function loginEmployee(email, password) {
  // Ensure both credentials are provided
  if (!email || !password) {
    throw new Error('Missing email or password');
  }

  // Find the employee by their unique email
  const employee = await prisma.employee.findUnique({ where: { email } });
  if (!employee) {
    throw new Error('Invalid credentials');
  }

  // Compare provided password with stored hash
  const isMatch = await bcrypt.compare(password, employee.password);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  // Generate a JWT token containing the user's ID
  const token = jwt.sign(
    { id: employee.id, role: employee.role, office_id: employee.office_id },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  return {
    token,
    user: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      office_id: employee.office_id
    }
  };
}

module.exports = {
  registerEmployee,
  loginEmployee
};
